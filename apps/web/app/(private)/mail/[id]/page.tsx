/**
 * Individual message view page.
 * Dynamic route for viewing a single message.
 * @module app/(private)/mail/[id]/page
 */

"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { MessageView } from "@/components/mail/message-view";

// Mock data - replace with Convex query
const mockMessage = {
  _id: "1",
  from: { name: "GitHub", address: "noreply@github.com" },
  to: [{ name: "You", address: "you@hustlemail.dev" }],
  cc: [],
  subject: "[hustlemail/api] Pull request #42: Add spam detection",
  bodyHtml: `
    <p><strong>mergify[bot]</strong> merged 1 commit into <code>main</code> from <code>feature/spam-detection</code></p>
    
    <h3>Summary</h3>
    <p>This PR adds AI-powered spam detection using Claude for intelligent email filtering.</p>
    
    <h3>Changes</h3>
    <ul>
      <li>Added <code>evaluateSpam()</code> function with blocklist + AI evaluation</li>
      <li>Created spam evaluation schema in Convex</li>
      <li>Integrated with SMTP ingress pipeline</li>
      <li>Added configurable spam threshold per domain</li>
    </ul>
    
    <h3>Testing</h3>
    <p>✅ Unit tests passing<br>
    ✅ Integration tests passing<br>
    ✅ Manually tested with known spam samples</p>
    
    <hr>
    <p style="color: #666; font-size: 12px;">
      Reply to this email directly, <a href="https://github.com/hustlemail/api/pull/42">view it on GitHub</a>, 
      or <a href="https://github.com/notifications/unsubscribe">unsubscribe</a>.
    </p>
  `,
  bodyText: "mergify[bot] merged 1 commit into main from feature/spam-detection...",
  date: Date.now() - 1000 * 60 * 15,
  isRead: true,
  isStarred: true,
  labels: ["Work"],
  attachments: [],
  threadId: "thread-1",
};

const mockThreadMessages = [
  {
    _id: "thread-1-msg-1",
    from: { name: "You", address: "you@hustlemail.dev" },
    to: [{ address: "noreply@github.com" }],
    subject: "Re: [hustlemail/api] Pull request #42: Add spam detection",
    bodyHtml: "<p>Opening this PR for spam detection. Let me know if you have any feedback!</p>",
    bodyText: "Opening this PR for spam detection. Let me know if you have any feedback!",
    date: Date.now() - 1000 * 60 * 60 * 2,
    isRead: true,
    isStarred: false,
    labels: [],
    attachments: [],
  },
  {
    _id: "thread-1-msg-2",
    from: { name: "alex-reviewer", address: "alex@github.com" },
    to: [{ address: "you@hustlemail.dev" }],
    subject: "Re: [hustlemail/api] Pull request #42: Add spam detection",
    bodyHtml: `
      <p>Great work! A few comments:</p>
      <ul>
        <li>Consider adding rate limiting for the AI calls</li>
        <li>The blocklist could be moved to config</li>
      </ul>
      <p>Otherwise LGTM! 👍</p>
    `,
    bodyText: "Great work! A few comments...",
    date: Date.now() - 1000 * 60 * 45,
    isRead: true,
    isStarred: false,
    labels: [],
    attachments: [],
  },
  mockMessage,
];

export default function MessagePage() {
  const params = useParams();
  const router = useRouter();
  const [message, setMessage] = useState(mockMessage);

  const handleStar = () => {
    setMessage((m) => ({ ...m, isStarred: !m.isStarred }));
  };

  const handleArchive = () => {
    router.push("/mail/inbox");
  };

  const handleDelete = () => {
    router.push("/mail/inbox");
  };

  const handleReply = () => {
    router.push(`/mail/compose?replyTo=${params.id}`);
  };

  const handleForward = () => {
    router.push(`/mail/compose?forward=${params.id}`);
  };

  return (
    <MessageView
      message={message}
      threadMessages={mockThreadMessages}
      onStar={handleStar}
      onArchive={handleArchive}
      onDelete={handleDelete}
      onReply={handleReply}
      onForward={handleForward}
    />
  );
}
