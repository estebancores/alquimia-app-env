import type { APIRoute } from 'astro';

const API_BASE = import.meta.env.API_BASE_URL ?? 'http://localhost:3001';
const INTERNAL_API_KEY = import.meta.env.INTERNAL_API_KEY as string | undefined;

/**
 * Same-origin proxy for order creation. The browser calls this endpoint and we
 * forward to the API server-side, keeping API_BASE_URL and the internal key
 * out of client bundles.
 */
export const POST: APIRoute = async ({ request }) => {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  try {
    const res = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
        ...(INTERNAL_API_KEY ? { 'x-internal-key': INTERNAL_API_KEY } : {}),
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });
    const body = await res.json().catch(() => null);
    return Response.json(body ?? { success: false, error: 'API error' }, { status: res.status });
  } catch {
    return Response.json({ success: false, error: 'API unreachable' }, { status: 502 });
  }
};
