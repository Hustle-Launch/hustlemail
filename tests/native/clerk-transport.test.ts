import assert from "node:assert/strict";
import { test } from "vitest";
import {
  clerkFrontendOrigin,
  createNativeClerkFetch,
  type NativeClerkRequest,
} from "../../apps/native/src/clerk-transport";

const host = "sample-clerk-01.clerk.accounts.dev";
const publishableKey = `pk_test_${btoa(`${host}$`)}`;

test("native authentication stays confined to the configured Clerk API", async () => {
  const forwarded: (RequestInfo | URL)[] = [];
  let nativeRequests = 0;
  const fetch = createNativeClerkFetch(
    publishableKey,
    async (input) => {
      forwarded.push(input);
      return new Response("browser");
    },
    async () => {
      nativeRequests++;
      return { status: 200, headers: {}, body: "native" };
    },
  );
  for (const url of [
    "/local/path",
    "https://mail.convex.cloud/api/query",
    `https://${host}.evil.test/v1/client`,
    `http://${host}/v1/client`,
    `https://${host}/npm/@clerk/clerk-js/dist/clerk.browser.js`,
  ])
    assert.equal(await (await fetch(url)).text(), "browser");
  assert.equal(forwarded.length, 5);
  assert.equal(nativeRequests, 0);
  assert.equal(
    await (await fetch(`https://${host}/v1/client`)).text(),
    "native",
  );
  assert.equal(nativeRequests, 1);
});

test("native sign-in preserves form content while keeping credential headers out of JavaScript", async () => {
  let sent: NativeClerkRequest | undefined;
  const fetch = createNativeClerkFetch(
    publishableKey,
    async () => {
      throw new Error("Unexpected browser request");
    },
    async (request) => {
      sent = request;
      return {
        status: 422,
        headers: {
          "content-type": "application/json",
          authorization: "must-remain-native",
          "set-cookie": "must-not-reach-webview",
        },
        body: '{"errors":[{"code":"form_password_incorrect"}]}',
      };
    },
  );
  const response = await fetch(
    new Request(`https://${host}/v1/client/sign_ins`, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        authorization: "untrusted",
        cookie: "untrusted",
        origin: "tauri://localhost",
      },
      body: "identifier=person%40example.com&password=example%2Bpassword",
    }),
  );
  assert.equal(new URL(sent!.url).searchParams.get("_is_native"), "1");
  assert.equal(
    sent!.body,
    "identifier=person%40example.com&password=example%2Bpassword",
  );
  assert.equal(
    sent!.headers["content-type"],
    "application/x-www-form-urlencoded",
  );
  for (const name of ["authorization", "cookie", "origin"])
    assert.equal(sent!.headers[name], undefined);
  assert.equal(response.status, 422);
  assert.equal(
    (await response.json()).errors[0].code,
    "form_password_incorrect",
  );
  assert.equal(response.headers.get("authorization"), null);
  assert.equal(response.headers.get("set-cookie"), null);
});

test("aborted authentication requests do not reach native transport and empty responses remain valid", async () => {
  let requests = 0;
  const fetch = createNativeClerkFetch(
    publishableKey,
    globalThis.fetch,
    async () => {
      requests++;
      return { status: 204, headers: {}, body: "" };
    },
  );
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    fetch(`https://${host}/v1/client`, { signal: controller.signal }),
    { name: "AbortError" },
  );
  assert.equal(requests, 0);
  assert.equal(
    await (
      await fetch(`https://${host}/v1/client`, { method: "DELETE" })
    ).text(),
    "",
  );
});

test("malformed publishable keys cannot choose a credential-bearing destination", () => {
  assert.equal(clerkFrontendOrigin(publishableKey), `https://${host}`);
  for (const value of [
    "sk_test_secret",
    "pk_test_!",
    `pk_test_${btoa("evil.test@clerk.accounts.dev$")}`,
    `pk_test_${btoa("clerk.accounts.dev/path$")}`,
    `pk_test_${btoa("clerk.accounts.dev")}`,
  ])
    assert.throws(() => clerkFrontendOrigin(value));
});
