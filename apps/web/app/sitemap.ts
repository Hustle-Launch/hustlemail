/**
 * Dynamic sitemap generation for SEO.
 * @module app/sitemap
 */

import type { MetadataRoute } from "next";

/**
 * Generates the sitemap for search engine indexing.
 * @returns Array of sitemap entries with URLs and metadata.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://mail.hustlelaunch.com";

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
