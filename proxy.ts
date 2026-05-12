import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * Public paths — accessible without authentication.
 * Uses prefix matching: "/hotel" matches "/hotel/g123-d456".
 */
const PUBLIC_PATHS = [
  // Pages
  '/',
  '/search',
  '/compare',
  '/compare-hotels',
  '/deals',
  '/book',
  '/explore',
  '/agents',
  '/hotel',
  '/city',
  '/favorites',
  '/trips',
  '/dashboard',
  '/profile',
  '/about',
  '/contact',
  '/privacy',
  '/terms',
  // API routes
  '/api/auth',
  '/api/search',
  '/api/compare',
  '/api/health',
  '/api/agent',
  '/api/cheaper-dates',
  '/api/deals',
  '/api/og',
  '/api/me',
  '/api/agents/deals',
  '/api/agents/health-check',
  '/api/agents/recommendations',
  '/api/agents/availability',
  '/api/catalog/discover',
  '/api/catalog/validate',
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  );
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always allow public paths
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Skip auth if Kinde is not configured (local dev without env vars)
  if (!process.env.KINDE_ISSUER_URL) {
    return NextResponse.next();
  }

  // Protected routes — check authentication via Kinde middleware
  try {
    const mod = await import('@kinde-oss/kinde-auth-nextjs/middleware');
    const handler = mod.withAuth(async function () {}, {
      publicPaths: PUBLIC_PATHS,
    });

    if (typeof handler === 'function') {
      return await (handler as Function)(req);
    }
    return await handler;
  } catch {
    // Graceful degradation — allow through if auth service is unreachable
    return NextResponse.next();
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
