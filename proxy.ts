import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * Middleware bypass paths.
 * Uses prefix matching: "/hotel" matches "/hotel/g123-d456".
 *
 * Naming is intentionally explicit: some bypassed API paths are not public;
 * they enforce bearer, cron, or user auth inside their route handlers.
 */
const PUBLIC_PAGE_BYPASS_PATHS = [
  '/',
  '/search',
  '/compare',
  '/compare-hotels',
  '/deals',
  '/book',
  '/explore',
  '/hotel',
  '/city',
  '/favorites',
  '/trips',
  '/about',
  '/contact',
  '/offline',
  '/privacy',
  '/terms',
];

const PUBLIC_API_BYPASS_PATHS = [
  '/api/auth',
  '/api/search',
  '/api/compare',
  '/api/health',
  '/api/agent',
  '/api/cheaper-dates',
  '/api/deals',
  '/api/og',
  '/api/agents/deals',
  '/api/agents/recommendations',
  '/api/agents/price-recommendation',
  '/api/agents/availability',
  '/api/exchange-rates',
  '/api/geo',
  '/api/weather',
  '/api/city-info',
  '/api/holidays',
  '/api/destination-intel',
  '/api/pois',
  '/api/hotel-amenities',
  '/api/travel-guide',
  '/api/events',
  '/api/catalog/stats',
  '/api/price-history',
  '/api/price-alerts',
  '/api/reviews',
  '/api/property-content',
  '/api/i18n',
];

const INTERNAL_AUTH_API_BYPASS_PATHS = [
  '/api/admin',
  '/api/data-retention',
  '/api/ops/scorecard',
  '/api/ops/alerts',
  '/api/me',
  '/api/agents/audit',
  '/api/agents/discovered',
  '/api/agents/health-check',
  '/api/catalog/discover',
  '/api/catalog/discover-osm',
  '/api/catalog/candidates',
  '/api/catalog/validate',
  '/api/agents/providers',
  '/api/agents/auto',
  '/api/price-accuracy',
  '/api/click',
];

const MIDDLEWARE_BYPASS_PATHS = [
  ...PUBLIC_PAGE_BYPASS_PATHS,
  ...PUBLIC_API_BYPASS_PATHS,
  ...INTERNAL_AUTH_API_BYPASS_PATHS,
];

const KINDE_SESSION_COOKIE_PREFIXES = ['access_token', 'id_token'];

function isMiddlewareBypassPath(pathname: string): boolean {
  return MIDDLEWARE_BYPASS_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  );
}

function hasKindeSessionCookies(req: NextRequest): boolean {
  const cookieNames = req.cookies.getAll().map((cookie) => cookie.name);
  return KINDE_SESSION_COOKIE_PREFIXES.every((prefix) =>
    cookieNames.some((name) => name === prefix || name.startsWith(prefix))
  );
}

function redirectToLogin(req: NextRequest): NextResponse {
  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = '/api/auth/login';
  loginUrl.searchParams.set('post_login_redirect_url', req.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

/** Common exploit paths that bots probe — return 404 immediately to reduce noise */
const EXPLOIT_PATHS = [
  '/wp-admin', '/wp-login', '/wp-content', '/wp-includes', '/xmlrpc.php',
  '/.env', '/.git', '/.svn', '/phpmyadmin', '/admin.php', '/config.php',
  '/cgi-bin', '/wp-json', '/vendor', '/.well-known/security.txt',
];

function isExploitPath(pathname: string): boolean {
  const lower = pathname.toLowerCase();
  return EXPLOIT_PATHS.some((p) => lower.startsWith(p));
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Block common exploit probes — return 404 immediately
  if (isExploitPath(pathname)) {
    return new NextResponse(null, { status: 404 });
  }

  // Add request ID for tracing/debugging
  const requestId = crypto.randomUUID();
  const response = await handleRoute(req);
  response.headers.set('X-Request-Id', requestId);
  return response;
}

async function handleRoute(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Let route handlers own auth for public APIs and internally-authenticated APIs.
  if (isMiddlewareBypassPath(pathname)) {
    return NextResponse.next();
  }

  // Skip auth if Kinde is not configured (local dev without env vars)
  if (!process.env.KINDE_ISSUER_URL) {
    return NextResponse.next();
  }

  if (!hasKindeSessionCookies(req)) {
    return redirectToLogin(req);
  }

  // Protected routes — check authentication via Kinde middleware
  try {
    const mod = await import('@kinde-oss/kinde-auth-nextjs/middleware');
    const handler = mod.withAuth(async function () {}, {
      publicPaths: MIDDLEWARE_BYPASS_PATHS,
    });

    if (typeof handler === 'function') {
      const authHandler = handler as (request: NextRequest) => Promise<NextResponse> | NextResponse;
      return await authHandler(req);
    }
    return await handler;
  } catch {
    // Auth service unreachable — redirect to login instead of allowing through
    return redirectToLogin(req);
  }
}

export const config = {
  matcher: [
    /*
     * Match all paths except static assets:
     * - _next (Next.js internals)
     * - static files (images, fonts, etc.)
     */
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
  ],
};
