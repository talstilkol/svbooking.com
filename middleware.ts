import { withAuth } from "@kinde-oss/kinde-auth-nextjs/middleware";

export default withAuth(async function middleware(req) {}, {
  publicPaths: [
    "/",
    "/search",
    "/compare",
    "/book",
    "/api/listings",
    "/api/bookings",
    "/api/compare",
    "/api/health",
  ],
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
  ],
};
