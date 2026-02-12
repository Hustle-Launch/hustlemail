"use client";

import { useState, useEffect, useCallback } from "react";

// Types
export interface Message {
  _id: string;
  from: { name?: string; address: string };
  to: { name?: string; address: string }[];
  subject: string;
  snippet: string;
  bodyText?: string;
  bodyHtml?: string;
  date: number;
  receivedAt: number;
  isRead: boolean;
  isStarred: boolean;
  isArchived: boolean;
  isTrashed: boolean;
  isSpam: boolean;
  isSent: boolean;
  labels: string[];
  attachments: { filename: string; contentType: string; size: number }[];
  threadId?: string;
}

// Mock data for demo
const mockMessages: Message[] = [
  {
    _id: "1",
    from: { name: "GitHub", address: "noreply@github.com" },
    to: [{ address: "team@codemail.dev" }],
    subject: "[codemail/api] Pull request #42: Add spam detection",
    snippet: "mergify[bot] merged 1 commit into main from feature/spam-detection...",
    bodyText: "mergify[bot] merged 1 commit into main from feature/spam-detection.\n\nView pull request: https://github.com/codemail/api/pull/42",
    date: Date.now() - 1000 * 60 * 15,
    receivedAt: Date.now() - 1000 * 60 * 15,
    isRead: false,
    isStarred: true,
    isArchived: false,
    isTrashed: false,
    isSpam: false,
    isSent: false,
    labels: ["Work"],
    attachments: [],
  },
  {
    _id: "2",
    from: { name: "Vercel", address: "notifications@vercel.com" },
    to: [{ address: "team@codemail.dev" }],
    subject: "Deployment successful: codemail-web",
    snippet: "Your deployment is live at codemail.dev. Build time: 23s...",
    bodyText: "Your deployment is live!\n\nProject: codemail-web\nURL: https://codemail.dev\nBuild time: 23s\nRegion: iad1",
    date: Date.now() - 1000 * 60 * 60,
    receivedAt: Date.now() - 1000 * 60 * 60,
    isRead: true,
    isStarred: false,
    isArchived: false,
    isTrashed: false,
    isSpam: false,
    isSent: false,
    labels: ["Updates"],
    attachments: [],
  },
  {
    _id: "3",
    from: { name: "Linear", address: "notifications@linear.app" },
    to: [{ address: "team@codemail.dev" }],
    subject: "Issue CM-89: Spam filter improvements",
    snippet: "The current spam detection is flagging too many legitimate emails...",
    bodyText: "Issue updated\n\nCM-89: Spam filter improvements\nStatus: In Progress\nAssignee: You\n\nThe current spam detection is flagging too many legitimate emails. We need to tune the AI model thresholds.",
    date: Date.now() - 1000 * 60 * 60 * 3,
    receivedAt: Date.now() - 1000 * 60 * 60 * 3,
    isRead: false,
    isStarred: false,
    isArchived: false,
    isTrashed: false,
    isSpam: false,
    isSent: false,
    labels: ["Work"],
    attachments: [],
  },
  {
    _id: "4",
    from: { name: "Stripe", address: "notifications@stripe.com" },
    to: [{ address: "billing@codemail.dev" }],
    subject: "Payment received: $99.00",
    snippet: "You received a payment of $99.00 from customer@example.com...",
    bodyText: "Payment successful!\n\nAmount: $99.00\nCustomer: customer@example.com\nDescription: CodeMail Pro - Monthly\n\nView in dashboard: https://dashboard.stripe.com",
    date: Date.now() - 1000 * 60 * 60 * 24,
    receivedAt: Date.now() - 1000 * 60 * 60 * 24,
    isRead: true,
    isStarred: true,
    isArchived: false,
    isTrashed: false,
    isSpam: false,
    isSent: false,
    labels: [],
    attachments: [],
  },
  {
    _id: "5",
    from: { name: "Alex Thompson", address: "alex@example.com" },
    to: [{ address: "support@codemail.dev" }],
    subject: "Question about DKIM setup",
    snippet: "Hi, I'm having trouble setting up DKIM for my domain. The DNS records...",
    bodyText: "Hi,\n\nI'm having trouble setting up DKIM for my domain. The DNS records seem to be correct but the verification is failing.\n\nCan you help?\n\nThanks,\nAlex",
    date: Date.now() - 1000 * 60 * 60 * 24 * 2,
    receivedAt: Date.now() - 1000 * 60 * 60 * 24 * 2,
    isRead: true,
    isStarred: false,
    isArchived: false,
    isTrashed: false,
    isSpam: false,
    isSent: false,
    labels: ["Support"],
    attachments: [{ filename: "dns-screenshot.png", contentType: "image/png", size: 245000 }],
  },
];

type Folder = "inbox" | "sent" | "starred" | "archive" | "trash" | "spam";

export function useMessages(folder: Folder = "inbox") {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading
    setLoading(true);
    const timer = setTimeout(() => {
      let filtered = mockMessages;
      
      if (folder === "inbox") {
        filtered = mockMessages.filter(
          (m) => !m.isArchived && !m.isTrashed && !m.isSpam && !m.isSent
        );
      } else if (folder === "sent") {
        filtered = mockMessages.filter((m) => m.isSent);
      } else if (folder === "starred") {
        filtered = mockMessages.filter((m) => m.isStarred);
      } else if (folder === "archive") {
        filtered = mockMessages.filter((m) => m.isArchived);
      } else if (folder === "trash") {
        filtered = mockMessages.filter((m) => m.isTrashed);
      } else if (folder === "spam") {
        filtered = mockMessages.filter((m) => m.isSpam);
      }

      setMessages(filtered);
      setLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [folder]);

  const markAsRead = useCallback((id: string, isRead: boolean) => {
    setMessages((prev) =>
      prev.map((m) => (m._id === id ? { ...m, isRead } : m))
    );
  }, []);

  const toggleStar = useCallback((id: string) => {
    setMessages((prev) =>
      prev.map((m) => (m._id === id ? { ...m, isStarred: !m.isStarred } : m))
    );
  }, []);

  const archive = useCallback((id: string) => {
    setMessages((prev) =>
      prev.map((m) => (m._id === id ? { ...m, isArchived: true } : m))
    );
  }, []);

  const trash = useCallback((id: string) => {
    setMessages((prev) =>
      prev.map((m) => (m._id === id ? { ...m, isTrashed: true } : m))
    );
  }, []);

  return {
    messages,
    loading,
    markAsRead,
    toggleStar,
    archive,
    trash,
  };
}

export function useMessage(id: string) {
  const [message, setMessage] = useState<Message | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      const found = mockMessages.find((m) => m._id === id);
      setMessage(found || null);
      setLoading(false);
    }, 200);

    return () => clearTimeout(timer);
  }, [id]);

  return { message, loading };
}

export function useUnreadCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const unread = mockMessages.filter(
      (m) => !m.isRead && !m.isArchived && !m.isTrashed && !m.isSpam
    ).length;
    setCount(unread);
  }, []);

  return count;
}
