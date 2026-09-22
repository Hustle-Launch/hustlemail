/**
 * Clerk authentication proxy (Next.js 16+ middleware replacement).
 * Protects the mail and dashboard URLs in the (private) route group.
 * @module proxy
 */

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/** Route matcher for protected routes. */
export const isPrivateRoute = createRouteMatcher([
  "/mail(.*)",
  "/dashboard(.*)",
]);

/**
 * Clerk middleware that protects private routes.
 * Public routes (homepage, marketing, auth) are not protected.
 */
export default clerkMiddleware(async (auth, request) => {
  if (isPrivateRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Public pages must not enter Clerk's development handshake/noindex redirect.
    "/mail/:path*",
    "/dashboard/:path*",
    "/sign-in/:path*",
    "/sign-up/:path*",
    // Preserve existing API session handling.
    "/(api|trpc)(.*)",
  ],
};
