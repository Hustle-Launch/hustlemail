import { describe, expect, test } from "bun:test";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { NextRequest } from "next/server";
import { config, isPrivateRoute } from "./proxy";
import sitemap from "./app/sitemap";

describe("public indexing and private authentication", () => {
  test("public documents never enter the Clerk handshake", () => {
    for (const url of ["/", "/demo", "/robots.txt", "/sitemap.xml", "/manifest.webmanifest"]) {
      expect(unstable_doesMiddlewareMatch({ config, url })).toBe(false);
    }
  });

  test("mail, dashboard, authentication and API routes retain Clerk", () => {
    for (const url of ["/mail/inbox", "/dashboard", "/dashboard/settings", "/sign-in", "/sign-up", "/api/send"]) {
      expect(unstable_doesMiddlewareMatch({ config, url })).toBe(true);
    }
    for (const path of ["/mail/inbox", "/dashboard", "/dashboard/settings"]) {
      expect(isPrivateRoute(new NextRequest(`https://mail.hustlelaunch.com${path}`))).toBe(true);
    }
  });

  test("the sitemap only advertises crawlable public pages", () => {
    expect(sitemap().map((entry) => entry.url)).toEqual(["https://mail.hustlelaunch.com"]);
  });
});
