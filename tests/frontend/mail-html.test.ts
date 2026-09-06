// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { sanitizeMailHtml } from "../../apps/web/components/workspace/message-body";

const parse = (html: string) => {
  const template = document.createElement("template");
  template.innerHTML = html;
  return template.content;
};

describe("untrusted message HTML", () => {
  it("removes executable content and tracking resources before displaying a message", () => {
    const clean = parse(sanitizeMailHtml(`<base href="https://tracker.invalid/">
      <meta http-equiv="refresh" content="0;url=https://tracker.invalid/">
      <style>@import 'https://tracker.invalid/style'</style>
      <script>window.compromised = true</script>
      <iframe src="https://tracker.invalid/frame"></iframe>
      <svg onload="alert(1)"><image href="https://tracker.invalid/svg"/></svg>
      <form action="https://tracker.invalid"><input name="password"></form>
      <p onclick="alert(1)" style="background:url(https://tracker.invalid/css)">Hello <b>Michael</b></p>
      <img src="https://tracker.invalid/pixel" srcset="https://tracker.invalid/other 2x" onerror="alert(1)" alt="Quarterly chart">`, false));
    expect(clean.querySelector("script,style,iframe,base,meta,svg,form,input,img")).toBeNull();
    expect([...clean.querySelectorAll("*")].flatMap(node => [...node.attributes])).toEqual([]);
    expect(clean.textContent).toContain("Hello Michael");
    expect(clean.textContent).toContain("[Image: Quarterly chart]");
  });

  it("allows only explicit HTTPS images and isolates links from the app", () => {
    const clean = parse(sanitizeMailHtml(`<a href="javascript:alert(1)">Unsafe</a>
      <a href="https://example.com" ping="https://tracker.invalid" target="_top">Safe</a>
      <img src="https://example.com/image.png" alt="Photo" width="1" onload="alert(1)">
      <img src="http://example.com/insecure.png"><img src="data:image/svg+xml,bad">`, true));
    expect(clean.querySelectorAll("img")).toHaveLength(1);
    expect(clean.querySelector("img")?.getAttribute("referrerpolicy")).toBe("no-referrer");
    expect(clean.querySelector("img")?.hasAttribute("onload")).toBe(false);
    const links = clean.querySelectorAll("a");
    expect(links[0].hasAttribute("href")).toBe(false);
    expect(links[1].getAttribute("target")).toBe("_blank");
    expect(links[1].getAttribute("rel")).toBe("noopener noreferrer");
    expect(links[1].hasAttribute("ping")).toBe(false);
  });

  it("preserves readable content when malformed and nested markup is rejected", () => {
    const output = sanitizeMailHtml(`<unknown><p>Keep <em>this</em></p></unknown>
      <math><mtext><table><mglyph><style><!--</style><img title="--><img src=x onerror=alert(1)>"></math>
      <template><script>alert(1)</script></template><a href="jAvAsCrIpT:alert(1)">Text</a>`, false);
    const clean = parse(output);
    expect(clean.textContent).toContain("Keep this");
    expect(clean.querySelector("script,style,math,template,img")).toBeNull();
    expect([...clean.querySelectorAll("a")].every(link => !link.hasAttribute("href"))).toBe(true);
  });
});
