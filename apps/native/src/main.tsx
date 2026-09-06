import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ClerkProvider,
  SignIn,
  useAuth,
  useUser,
  useClerk,
} from "@clerk/clerk-react";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { LiveMail } from "../../web/components/workspace/live-mail";
import { PreviewMail } from "../../web/components/workspace/preview-mail";
import "../../web/components/workspace/workspace.css";
import "./native.css";
import { installNativeBridge } from "./platform";
import { invoke, isTauri } from "@tauri-apps/api/core";
import {
  clerkFrontendOrigin,
  createNativeClerkFetch,
  type NativeClerkResponse,
} from "./clerk-transport";

type Configuration = { convexUrl: string; clerkKey: string };
const configurationKey = "hustlemail.connection.v1";

function readConfiguration(): Configuration | null {
  try {
    const saved = localStorage.getItem(configurationKey);
    const value = saved
      ? (JSON.parse(saved) as Configuration)
      : {
          convexUrl: import.meta.env.VITE_CONVEX_URL || "",
          clerkKey: import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || "",
        };
    return value.convexUrl && value.clerkKey ? value : null;
  } catch {
    return null;
  }
}

function ConnectedMail() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { signOut } = useClerk();
  if (!isLoaded)
    return (
      <div className="native-status" role="status">
        Opening your mailbox…
      </div>
    );
  if (!isSignedIn || !user)
    return (
      <div className="native-auth">
        <SignIn routing="hash" />
      </div>
    );
  return (
    <LiveMail
      userId={user.id}
      userName={user.fullName || user.firstName || "You"}
      onSignOut={() => {
        void signOut();
      }}
    />
  );
}

function ConnectedApp({ config }: { config: Configuration }) {
  const client = useMemo(
    () => new ConvexReactClient(config.convexUrl),
    [config.convexUrl],
  );
  const native = isTauri();
  const [transportReady, setTransportReady] = useState(!native);
  const [authError, setAuthError] = useState("");
  useEffect(() => {
    if (!native) return;
    const browserFetch = window.fetch;
    try {
      const nativeFetch = createNativeClerkFetch(
        config.clerkKey,
        browserFetch.bind(window),
        (request) => invoke<NativeClerkResponse>("clerk_request", request),
        setAuthError,
      );
      window.fetch = nativeFetch;
      setTransportReady(true);
      return () => {
        if (window.fetch === nativeFetch) window.fetch = browserFetch;
      };
    } catch {
      setAuthError("The saved Clerk publishable key is invalid.");
    }
  }, [config.clerkKey, native]);
  if (!transportReady)
    return (
      <div className="native-status" role="status">
        {authError || "Preparing secure sign-in…"}
      </div>
    );
  return (
    <>
      {authError && (
        <div className="native-error" role="alert">
          {authError} <button onClick={() => location.reload()}>Retry</button>
        </div>
      )}
      <ClerkProvider
        publishableKey={config.clerkKey}
        standardBrowser={!native}
        allowedRedirectProtocols={
          native ? ["tauri:", "https:", "http:"] : undefined
        }
        signInFallbackRedirectUrl="/"
        signUpFallbackRedirectUrl="/"
      >
        <ConvexProviderWithClerk client={client} useAuth={useAuth}>
          <ConnectedMail />
        </ConvexProviderWithClerk>
      </ClerkProvider>
    </>
  );
}

function App() {
  const [config, setConfig] = useState(readConfiguration);
  const [preview, setPreview] = useState(
    new URLSearchParams(location.search).has("demo"),
  );
  const [error, setError] = useState("");
  if (preview) return <PreviewMail />;
  if (config) return <ConnectedApp key={config.clerkKey} config={config} />;
  return (
    <main className="native-setup">
      <div className="native-mark" aria-hidden="true">
        h.
      </div>
      <p className="native-eyebrow">YOUR MAIL. YOUR MOMENTUM.</p>
      <h1>Welcome to Hustlemail.</h1>
      <p>Connect your installation to open your mailbox on this device.</p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const convexUrl = String(data.get("convexUrl") || "").trim();
          const clerkKey = String(data.get("clerkKey") || "").trim();
          try {
            const url = new URL(convexUrl);
            const local = ["localhost", "127.0.0.1", "[::1]"].includes(
              url.hostname,
            );
            if (
              url.protocol !== "https:" &&
              !(local && url.protocol === "http:")
            )
              throw new Error(
                "Use an HTTPS backend URL, or localhost for development.",
              );
            clerkFrontendOrigin(clerkKey);
            const next = { convexUrl: url.origin, clerkKey };
            localStorage.setItem(configurationKey, JSON.stringify(next));
            setConfig(next);
          } catch (cause) {
            setError(
              cause instanceof Error
                ? cause.message
                : "Check your connection details.",
            );
          }
        }}
      >
        <label>
          Convex deployment URL
          <input
            name="convexUrl"
            type="url"
            placeholder="https://your-deployment.convex.cloud"
            required
          />
        </label>
        <label>
          Clerk publishable key
          <input
            name="clerkKey"
            placeholder="pk_live_…"
            autoComplete="off"
            required
          />
        </label>
        <p className="native-caption">
          These are public connection settings. Provider secret keys stay on
          your server.
        </p>
        {error && (
          <p className="native-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit">
          Connect mailbox <span aria-hidden="true">↗</span>
        </button>
      </form>
      <button className="native-preview" onClick={() => setPreview(true)}>
        Explore with sample mail
      </button>
    </main>
  );
}

void installNativeBridge()
  .catch(() => console.warn("Some native integrations are unavailable."))
  .finally(() =>
    createRoot(document.getElementById("root")!).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    ),
  );
