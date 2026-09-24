import type { APIRoute } from 'astro';
import { orderLogger } from '../../lib/posthog-logger';
import { serverPostHog } from '../../lib/posthog-server';

const API_BASE = import.meta.env.API_BASE_URL ?? 'http://localhost:3001';
const INTERNAL_API_KEY = import.meta.env.INTERNAL_API_KEY as string | undefined;

/**
 * Same-origin proxy for order creation. The browser calls this endpoint and we
 * forward to the API server-side, keeping API_BASE_URL and the internal key
 * out of client bundles.
 */
export const POST: APIRoute = async ({ request }) => {
  const distinctId = request.headers.get('X-POSTHOG-DISTINCT-ID') ?? crypto.randomUUID();
  const sessionId = request.headers.get('X-POSTHOG-SESSION-ID');
  const analyticsProperties = sessionId ? { $session_id: sessionId } : undefined;
  const logContext = { posthogDistinctId: distinctId, ...(sessionId ? { sessionId } : {}) };
  const startedAt = Date.now();
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    serverPostHog?.capture({
      distinctId,
      event: 'order_creation_failed',
      properties: { ...analyticsProperties, failure_reason: 'invalid_json', status_code: 400 },
    });
    orderLogger.emit({
      severityText: 'ERROR',
      body: 'order request completed',
      attributes: {
        ...logContext,
        status: 'failed',
        failure_reason: 'invalid_json',
        status_code: 400,
        duration_ms: Date.now() - startedAt,
      },
    });
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
    serverPostHog?.capture({
      distinctId,
      event: res.ok ? 'order_created' : 'order_creation_failed',
      properties: {
        ...analyticsProperties,
        status_code: res.status,
        ...(res.ok ? {} : { failure_reason: 'upstream_response' }),
      },
    });
    orderLogger.emit({
      severityText: res.ok ? 'INFO' : 'ERROR',
      body: 'order request completed',
      attributes: {
        ...logContext,
        status: res.ok ? 'success' : 'failed',
        status_code: res.status,
        duration_ms: Date.now() - startedAt,
      },
    });
    return Response.json(body ?? { success: false, error: 'API error' }, { status: res.status });
  } catch {
    serverPostHog?.capture({
      distinctId,
      event: 'order_creation_failed',
      properties: { ...analyticsProperties, failure_reason: 'upstream_unreachable', status_code: 502 },
    });
    orderLogger.emit({
      severityText: 'ERROR',
      body: 'order request completed',
      attributes: {
        ...logContext,
        status: 'failed',
        failure_reason: 'upstream_unreachable',
        status_code: 502,
        duration_ms: Date.now() - startedAt,
      },
    });
    return Response.json({ success: false, error: 'API unreachable' }, { status: 502 });
  }
};
