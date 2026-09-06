import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Hustlemail",
    short_name: "Hustlemail",
    description: "Your conversations, front and center.",
    start_url: "/mail/inbox",
    display: "standalone",
    background_color: "#15151b",
    theme_color: "#15151b",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
