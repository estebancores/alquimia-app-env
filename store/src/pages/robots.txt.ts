import type { APIRoute } from 'astro';

/**
 * Search crawlers are covered by `User-agent: *`. AI crawlers are listed
 * explicitly so the catalog stays discoverable in ChatGPT, Claude, Perplexity,
 * Gemini, Apple Intelligence and friends — including their on-demand fetchers
 * (ChatGPT-User, Perplexity-User) which answer user questions in real time.
 */
const AI_BOTS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-User',
  'Claude-SearchBot',
  'anthropic-ai',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Applebot-Extended',
  'Meta-ExternalAgent',
  'Meta-ExternalFetcher',
  'Amazonbot',
  'CCBot',
  'cohere-ai',
  'cohere-training-data-crawler',
];

export const GET: APIRoute = ({ site, url }) => {
  const base = (site ?? new URL(url.origin)).href.replace(/\/$/, '');

  const groups = [
    `User-agent: *\nAllow: /\nDisallow: /cart`,
    ...AI_BOTS.map((bot) => `User-agent: ${bot}\nAllow: /\nDisallow: /cart`),
  ];

  const body = `${groups.join('\n\n')}\n\nSitemap: ${base}/sitemap.xml\n`;
  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=86400',
    },
  });
};
