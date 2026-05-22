import { AGENT_NAMES } from '@/lib/agent-utils';
import { recordAdminAuditEvent } from '@/lib/admin-audit';
import { verifyAdminSession } from '@/lib/admin-session';
import { assertSameOrigin } from '@/lib/request-origin';
import { errorResponse } from '@/lib/validation';

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };
const AUTO_AGENT_NAMES = new Set(Object.values(AGENT_NAMES));

const TARGETS = new Map([
  ['GET /api/admin/agents/health-check', { path: '/api/agents/health-check', secret: 'ADMIN_API_SECRET' }],
  ['GET /api/admin/agents/providers', { path: '/api/agents/providers', secret: 'ADMIN_API_SECRET' }],
  ['POST /api/admin/agents/providers', { path: '/api/agents/providers', secret: 'ADMIN_API_SECRET', mutation: true }],
  ['GET /api/admin/catalog/candidates', { path: '/api/catalog/candidates', secret: 'ADMIN_API_SECRET' }],
  ['POST /api/admin/catalog/candidates', { path: '/api/catalog/candidates', secret: 'ADMIN_API_SECRET', mutation: true }],
  ['GET /api/admin/agents/auto/status', { path: '/api/agents/auto/status', secret: 'ADMIN_API_SECRET' }],
]);

function resolveTarget(request) {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();
  const exact = TARGETS.get(`${method} ${url.pathname}`);
  if (exact) return exact;

  const agentMatch = url.pathname.match(/^\/api\/admin\/agents\/auto\/([a-z0-9-]+)$/u);
  if (method === 'GET' && agentMatch && AUTO_AGENT_NAMES.has(agentMatch[1])) {
    return {
      path: `/api/agents/auto/${agentMatch[1]}`,
      secret: 'CRON_SECRET',
      mutation: true,
    };
  }

  return null;
}

function bridgeHeaders(request, token) {
  const headers = new Headers();
  headers.set('Authorization', `Bearer ${token}`);
  headers.set('Cache-Control', 'no-store');
  headers.set('Accept', 'application/json');

  const contentType = request.headers.get('content-type');
  if (contentType) headers.set('Content-Type', contentType);

  const userAgent = request.headers.get('user-agent');
  if (userAgent) headers.set('User-Agent', userAgent);

  return headers;
}

function responseHeaders(response) {
  const headers = new Headers(NO_STORE_HEADERS);
  const contentType = response.headers.get('content-type');
  if (contentType) headers.set('Content-Type', contentType);
  return headers;
}

async function forwardToInternalRoute(request, target) {
  const token = process.env[target.secret];
  if (!token) {
    return Response.json(
      { error: `${target.secret} is not configured` },
      { status: 503, headers: NO_STORE_HEADERS }
    );
  }

  const sourceUrl = new URL(request.url);
  const targetUrl = new URL(target.path, sourceUrl.origin);
  targetUrl.search = sourceUrl.search;

  const init = {
    method: request.method,
    headers: bridgeHeaders(request, token),
    cache: 'no-store',
  };

  if (!['GET', 'HEAD'].includes(request.method.toUpperCase())) {
    init.body = await request.text();
  }

  const response = await fetch(targetUrl, init);
  return new Response(response.body, {
    status: response.status,
    headers: responseHeaders(response),
  });
}

async function handle(request) {
  try {
    const target = resolveTarget(request);
    if (!target) {
      return Response.json({ error: 'Admin bridge target is not allowed' }, { status: 404, headers: NO_STORE_HEADERS });
    }

    if (target.mutation) {
      assertSameOrigin(request);
    }

    const auth = await verifyAdminSession();
    if (!auth.authorized) return auth.response;

    const response = await forwardToInternalRoute(request, target);

    if (target.mutation) {
      await recordAdminAuditEvent({
        request,
        actor: auth.subject,
        action: 'admin.bridge.forward',
        resource: target.path,
        status: response.ok ? 'success' : 'failure',
        details: { method: request.method, status: response.status },
      });
    }

    return response;
  } catch (err) {
    return errorResponse(err);
  }
}

export async function GET(request) {
  return handle(request);
}

export async function POST(request) {
  return handle(request);
}
