/**
 * Application providers wrapper.
 * Composes Clerk, Convex, theme, and tooltip providers.
 * Falls back to minimal providers when env vars are missing.
 * @module components/providers
 */

"use client";

import { ConvexReactClient } from "convex/react";
import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";

/** Convex URL from environment. */
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
/** Convex client instance (null if URL not configured). */
const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;

/**
 * Root providers component that wraps the application.
 * Provides Clerk auth, Convex real-time DB, theming, and tooltips.
 * @param children - Child components to render.
 * @returns The provider-wrapped children.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  // If no Convex/Clerk config, render minimal providers (for marketing pages)
  if (!convex || !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return (
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem
        disableTransitionOnChange
      >
        <TooltipProvider delayDuration={0}>
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              className: "font-sans",
            }}
          />
        </TooltipProvider>
      </ThemeProvider>
    );
  }

  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      appearance={{
        variables: {
          colorPrimary: "#6366f1",
        },
      }}
    >
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider delayDuration={0}>
            {children}
            <Toaster
              position="bottom-right"
              toastOptions={{
                className: "font-sans",
              }}
            />
          </TooltipProvider>
        </ThemeProvider>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
