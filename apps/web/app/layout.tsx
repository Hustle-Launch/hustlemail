/**
 * Root layout for the CodeMail application.
 * Sets up fonts, metadata, and wraps pages in providers.
 * @module app/layout
 */

import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

/** Inter font for UI text. */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

/** JetBrains Mono font for code/monospace text. */
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

/** Site-wide metadata for SEO and social sharing. */
export const metadata: Metadata = {
  metadataBase: new URL("https://codemail.vercel.app"),
  title: {
    default: "CodeMail - Email Infrastructure in Your Repo",
    template: "%s | CodeMail",
  },
  description: "Email infrastructure that lives in your GitHub repo. Config as code, deploy like an app, costs pennies.",
  keywords: ["email", "smtp", "infrastructure", "developer", "api", "typescript"],
  authors: [{ name: "CodeMail" }],
  creator: "CodeMail",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://codemail.vercel.app",
    siteName: "CodeMail",
    title: "CodeMail - Email Infrastructure in Your Repo",
    description: "Email infrastructure that lives in your GitHub repo. Config as code, deploy like an app, costs pennies.",
  },
  twitter: {
    card: "summary_large_image",
    title: "CodeMail - Email Infrastructure in Your Repo",
    description: "Email infrastructure that lives in your GitHub repo. Config as code, deploy like an app, costs pennies.",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/icon-192.png",
  },
};

/**
 * Root layout component.
 * @param children - Page content to render.
 * @returns The HTML document structure.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased noise`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
