import type { APIRoute } from 'astro';
import sharp from 'sharp';
import { GET as transformImage } from 'astro/assets/endpoint/node';

/**
 * Production /_image endpoint (wired in astro.config.mjs for builds only).
 *
 * SSR pages can't have local assets (hero, category tiles) optimized at build
 * time, so Astro's stock endpoint decodes the multi-MB originals with sharp on
 * every request. This wrapper transforms each distinct URL once, keeps the
 * (small) output in a byte-bounded LRU, dedupes concurrent requests, and runs
 * transforms one at a time so large originals are never decoded in parallel.
 */
sharp.cache(false);
sharp.concurrency(1);

const MAX_CACHE_BYTES = 32 * 1024 * 1024;

interface Entry {
  status: number;
  headers: [string, string][];
  body: ArrayBuffer;
}

const cache = new Map<string, Entry>();
const inflight = new Map<string, Promise<Entry>>();
let cachedBytes = 0;
let queue: Promise<unknown> = Promise.resolve();

function store(key: string, entry: Entry): void {
  if (entry.body.byteLength > MAX_CACHE_BYTES / 4) return;
  cache.set(key, entry);
  cachedBytes += entry.body.byteLength;
  while (cachedBytes > MAX_CACHE_BYTES) {
    const [oldestKey, oldest] = cache.entries().next().value as [string, Entry];
    cache.delete(oldestKey);
    cachedBytes -= oldest.body.byteLength;
  }
}

function serialized<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.catch(() => undefined);
  return run;
}

const toResponse = (entry: Entry) =>
  new Response(entry.body, { status: entry.status, headers: entry.headers });

export const GET: APIRoute = async (context) => {
  const { pathname, search } = new URL(context.request.url);
  const key = pathname + search;

  const hit = cache.get(key);
  if (hit) {
    cache.delete(key);
    cache.set(key, hit);
    return toResponse(hit);
  }

  let pending = inflight.get(key);
  if (!pending) {
    pending = serialized(async (): Promise<Entry> => {
      const res = await transformImage(context);
      return { status: res.status, headers: [...res.headers], body: await res.arrayBuffer() };
    })
      .then((entry) => {
        if (entry.status === 200) store(key, entry);
        return entry;
      })
      .finally(() => inflight.delete(key));
    inflight.set(key, pending);
  }
  return toResponse(await pending);
};
