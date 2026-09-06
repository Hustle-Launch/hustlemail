import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/providers";
import "./globals.css";
import "@/components/workspace/workspace.css";

export const metadata: Metadata = {
  title: {
    default: "Hustlemail — A clearer inbox",
    template: "%s | Hustlemail",
  },
  description:
    "Your conversations, front and center. A thoughtful, keyboard-first home for your domain email.",
  icons: { icon: "/icon.svg" },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#15151b",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
