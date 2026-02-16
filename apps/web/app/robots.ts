/**
 * Robots.txt configuration for search engine crawling.
 * @module app/robots
 */

import type { MetadataRoute } from "next";

/**
 * Generates the robots.txt rules.
 * Allows public pages, disallows API and private routes.
 * @returns Robots configuration object.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/mail/", "/dashboard/"],
    },
    sitemap: "https://codemail.vercel.app/sitemap.xml",
  };
}
