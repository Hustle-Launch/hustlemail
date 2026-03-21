/**
 * Clerk authentication proxy (Next.js 16+ middleware replacement).
 * Protects routes under /(private)/ route group.
 * @module proxy
 */

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/** Route matcher for protected routes. */
const isPrivateRoute = createRouteMatcher(["/(private)(.*)"]);

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
    // Skip Next.js internals and all static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
