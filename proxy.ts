import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const PUBLIC_PATHS = [
  "/",
  "/search",
  "/compare",
  "/compare-hotels",
  "/deals",
  "/book",
  "/explore",
  "/agents",
  "/hotel",
  "/city",
  "/api/search",
  "/api/listings",
  "/api/bookings",
  "/api/compare",
  "/api/health",
  "/api/agent",
  "/api/cheaper-dates",
  "/api/deals",
  "/api/agents/deals",
  "/api/agents/health-check",
  "/api/agents/recommendations",
  "/api/agents/availability",
  "/api/me",
  "/api/og",
  "/favorites",
  "/trips",
  "/about",
  "/contact",
  "/privacy",
  "/terms",
];

export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;

  if (PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  if (!process.env.KINDE_ISSUER_URL) {
    return NextResponse.next();
  }

  try {
    const mod = await import("@kinde-oss/kinde-auth-nextjs/middleware");
    const result = mod.withAuth(async function () {}, { publicPaths: PUBLIC_PATHS });
    if (typeof result === "function") {
      return await (result as Function)(req);
    }
    return await result;
  } catch {
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
  ],
};
