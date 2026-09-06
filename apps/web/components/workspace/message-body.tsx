"use client";

import { useEffect, useMemo, useState } from "react";
import type { MailMessage } from "./types";

const TAGS = new Set([
  "P",
  "BR",
  "DIV",
  "SPAN",
  "B",
  "STRONG",
  "I",
  "EM",
  "U",
  "S",
  "BLOCKQUOTE",
  "PRE",
  "CODE",
  "A",
  "UL",
  "OL",
  "LI",
  "TABLE",
  "THEAD",
  "TBODY",
  "TR",
  "TH",
  "TD",
  "H1",
  "H2",
  "H3",
  "H4",
  "HR",
  "IMG",
]);
const DROP = new Set([
  "SCRIPT",
  "STYLE",
  "IFRAME",
  "OBJECT",
  "EMBED",
  "FORM",
  "INPUT",
  "BUTTON",
  "META",
  "LINK",
  "BASE",
  "SVG",
  "MATH",
  "TEMPLATE",
]);
export function sanitizeMailHtml(html: string, allowImages: boolean): string {
  // Template contents remain inert: images and frames cannot fetch while parsing.
  const template = document.createElement("template");
  template.innerHTML = html;
  const visit = (node: ParentNode) => {
    for (const child of [...node.children]) {
      if (DROP.has(child.tagName)) {
        child.remove();
        continue;
      }
      visit(child);
      if (!TAGS.has(child.tagName)) {
        child.replaceWith(...child.childNodes);
        continue;
      }
      const href = child.getAttribute("href");
      const src = child.getAttribute("src");
      const alt = child.getAttribute("alt");
      for (const attr of [...child.attributes])
        child.removeAttribute(attr.name);
      if (
        child.tagName === "A" &&
        href &&
        /^(https?:|mailto:)/i.test(href.trim())
      ) {
        child.setAttribute("href", href);
        child.setAttribute("target", "_blank");
        child.setAttribute("rel", "noopener noreferrer");
      }
      if (child.tagName === "IMG") {
        if (allowImages && src && /^https:\/\//i.test(src.trim())) {
          child.setAttribute("src", src);
          child.setAttribute("referrerpolicy", "no-referrer");
          child.setAttribute("alt", alt || "Email image");
        } else
          child.replaceWith(
            document.createTextNode(
              alt ? `[Image: ${alt}]` : "[Image blocked]",
            ),
          );
      }
    }
  };
  visit(template.content);
  return template.innerHTML;
}
export function MessageBody({ message }: { message: MailMessage }) {
  const [formatting, setFormatting] = useState(false);
  const [allowImages, setAllowImages] = useState(false);
  const [sanitized, setSanitized] = useState("");
  useEffect(() => {
    setAllowImages(false);
    setFormatting(false);
    setSanitized("");
  }, [message._id]);
  useEffect(() => {
    if (formatting && message.bodyHtml)
      setSanitized(sanitizeMailHtml(message.bodyHtml, allowImages));
  }, [formatting, message.bodyHtml, allowImages]);
  const source = useMemo(
    () =>
      `<!doctype html><html><head><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src ${allowImages ? "https:" : "'none'"}; base-uri 'none'; form-action 'none'"><style>body{font:15px/1.75 system-ui,sans-serif;color:#292833;margin:20px;overflow-wrap:anywhere}a{color:#6354b8}img{max-width:100%;height:auto}table{max-width:100%;border-collapse:collapse}td,th{padding:6px}blockquote{border-left:2px solid #d9d5e8;padding-left:16px;margin-left:0;color:#747180}pre{white-space:pre-wrap}</style></head><body>${sanitized}</body></html>`,
    [sanitized, allowImages],
  );
  return (
    <div className="hm-message-body">
      {message.bodyHtml && (
        <div className="hm-format-bar">
          <button onClick={() => setFormatting(!formatting)}>
            {formatting ? "Show plain text" : "Show original formatting"}
          </button>
          {formatting && (
            <button onClick={() => setAllowImages(!allowImages)}>
              {allowImages ? "Block external images" : "Load external images"}
            </button>
          )}
          <span>
            External images{" "}
            {allowImages ? "allowed for this message" : "blocked"}
          </span>
        </div>
      )}
      {formatting && sanitized ? (
        <iframe
          title="Formatted email"
          srcDoc={source}
          sandbox="allow-popups allow-popups-to-escape-sandbox"
          referrerPolicy="no-referrer"
          className="hm-email-frame"
        />
      ) : (
        <div className="hm-plain-body">
          {message.bodyText ||
            message.snippet ||
            "This message has no plain-text content. Use original formatting to read the HTML version."}
        </div>
      )}
    </div>
  );
}
