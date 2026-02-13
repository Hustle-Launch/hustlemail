import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  // Auth pages
  "/sign-in(.*)",
  "/sign-up(.*)",
  // Marketing pages (no auth required)
  "/",
  "/pricing(.*)",
  "/features(.*)",
  "/about(.*)",
  "/blog(.*)",
  "/terms(.*)",
  "/privacy(.*)",
  // API endpoints
  "/api/inbound",
  "/api/dns/(.*)",
  // Allow dashboard/mail in demo mode (no Clerk configured)
  "/dashboard(.*)",
  "/mail(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
