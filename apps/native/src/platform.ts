import { isTauri } from "@tauri-apps/api/core";

/** Native capabilities are reachable only from trusted bundled app code. */
export async function installNativeBridge(): Promise<void> {
  if (!isTauri()) return;
  const [{ listen }, { openUrl }, links, notifications] = await Promise.all([
    import("@tauri-apps/api/event"), import("@tauri-apps/plugin-opener"),
    import("@tauri-apps/plugin-deep-link"), import("@tauri-apps/plugin-notification"),
  ]);
  let workspaceReady = false;
  const pending: string[] = [];
  await listen<string>("mail-command", ({ payload }) => window.dispatchEvent(new CustomEvent("hustlemail:command", { detail: { id: payload } })));
  const receiveLinks = (urls: string[]) => {
    if (!workspaceReady) { pending.push(...urls.slice(0, 10)); return; }
    for (const raw of urls) {
      try {
        const url = new URL(raw);
        if (url.protocol === "mailto:" || (url.protocol === "hustlemail:" && url.hostname === "compose")) {
          window.dispatchEvent(new CustomEvent("hustlemail:compose", { detail: {
            to: url.protocol === "mailto:" ? decodeURIComponent(url.pathname) : url.searchParams.get("to") || "",
            subject: url.searchParams.get("subject") || "", body: url.searchParams.get("body") || "",
          } }));
        }
      } catch { /* Invalid external deep links do not change application state. */ }
    }
  };
  window.addEventListener("hustlemail:ready", () => {
    workspaceReady = true;
    if (pending.length) receiveLinks(pending.splice(0, pending.length));
  });
  window.addEventListener("hustlemail:unready", () => { workspaceReady = false; });
  await links.onOpenUrl(receiveLinks);
  const initial = await links.getCurrent();
  if (initial) receiveLinks(initial);
  document.addEventListener("click", (event) => {
    const link = (event.target as Element | null)?.closest<HTMLAnchorElement>("a[href]");
    if (!link || event.defaultPrevented) return;
    const url = new URL(link.href, location.href);
    if (url.protocol === "mailto:") {
      event.preventDefault(); receiveLinks([url.href]);
    } else if (["http:", "https:"].includes(url.protocol) && url.origin !== location.origin && !link.hasAttribute("download")) {
      event.preventDefault(); void openUrl(url.href).catch(() => {});
    }
  });
  window.addEventListener("hustlemail:enable-notifications", () => { void notifications.requestPermission().catch(() => {}); });
  window.addEventListener("hustlemail:notify", () => {
    if (document.hasFocus()) return;
    void notifications.isPermissionGranted().then((granted) => {
      if (granted) notifications.sendNotification({ title: "Hustlemail", body: "New mail in your inbox." });
    }).catch(() => {});
  });
}
