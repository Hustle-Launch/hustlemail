export type NativeClerkRequest = {
  publishableKey: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
};
export type NativeClerkResponse = {
  status: number;
  headers: Record<string, string>;
  body: string;
};

export function clerkFrontendOrigin(publishableKey: string): string {
  if (!/^pk_(test|live)_/.test(publishableKey))
    throw new Error("Invalid Clerk publishable key.");
  let decoded: string;
  try {
    decoded = atob(publishableKey.slice(8));
  } catch {
    throw new Error("Invalid Clerk publishable key.");
  }
  if (
    !/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\$$/i.test(decoded) ||
    !decoded.includes(".")
  )
    throw new Error("Invalid Clerk frontend host.");
  return `https://${decoded.slice(0, -1).toLowerCase()}`;
}

/** Clerk's native client token stays in the OS credential store behind this narrow bridge. */
export function createNativeClerkFetch(
  publishableKey: string,
  browserFetch: typeof fetch,
  requestNative: (request: NativeClerkRequest) => Promise<NativeClerkResponse>,
  onConnectionStatus?: (message: string) => void,
): typeof fetch {
  const origin = clerkFrontendOrigin(publishableKey);
  return async (input, init) => {
    let url: URL;
    try {
      url = new URL(input instanceof Request ? input.url : String(input));
    } catch {
      return browserFetch(input, init);
    }
    if (url.origin !== origin || !url.pathname.startsWith("/v1/"))
      return browserFetch(input, init);
    const request = new Request(input, init);
    request.signal.throwIfAborted();
    const headers = new Headers(request.headers);
    // Rust supplies authentication and validates the destination independently.
    for (const header of [
      "authorization",
      "cookie",
      "origin",
      "referer",
      "host",
    ])
      headers.delete(header);
    url.searchParams.set("_is_native", "1");
    try {
      const response = await requestNative({
        publishableKey,
        url: url.href,
        method: request.method,
        headers: Object.fromEntries(headers.entries()),
        body:
          request.method === "GET" || request.method === "HEAD"
            ? null
            : await request.text(),
      });
      request.signal.throwIfAborted();
      onConnectionStatus?.("");
      const responseHeaders = new Headers(response.headers);
      responseHeaders.delete("authorization");
      responseHeaders.delete("set-cookie");
      return new Response(
        [204, 205, 304].includes(response.status) ? null : response.body,
        {
          status: response.status,
          headers: responseHeaders,
        },
      );
    } catch (error) {
      if (!request.signal.aborted)
        onConnectionStatus?.(
          typeof error === "string"
            ? error
            : error instanceof Error
              ? error.message
              : "The secure sign-in connection is unavailable. Please try again.",
        );
      throw error;
    }
  };
}
