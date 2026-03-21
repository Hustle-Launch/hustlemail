/**
 * Inbox page displaying the primary email inbox.
 * Features message list with filtering and keyboard shortcuts.
 * @module app/(private)/mail/inbox/page
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Settings, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MessageList } from "@/components/mail/message-list";

/** Mock messages for demo - replace with Convex query in production. */
const mockMessages = [
  {
    _id: "1",
    from: { name: "GitHub", address: "noreply@github.com" },
    subject: "[hustlemail/api] Pull request #42: Add spam detection",
    snippet: "mergify[bot] merged 1 commit into main from feature/spam-detection. This PR adds AI-powered spam detection using Claude...",
    date: Date.now() - 1000 * 60 * 15, // 15 min ago
    isRead: false,
    isStarred: true,
    labels: ["Work"],
    attachments: [],
  },
  {
    _id: "2",
    from: { name: "Vercel", address: "notifications@vercel.com" },
    subject: "Deployment succeeded for hustlemail",
    snippet: "Your deployment has completed successfully. Preview: https://hustlemail-git-main.vercel.app",
    date: Date.now() - 1000 * 60 * 45, // 45 min ago
    isRead: false,
    isStarred: false,
    labels: ["Updates"],
    attachments: [],
  },
  {
    _id: "3",
    from: { name: "Alex Thompson", address: "alex@example.com" },
    subject: "Re: Q1 Planning meeting notes",
    snippet: "Thanks for sharing the notes! I had a few thoughts on the roadmap priorities we discussed...",
    date: Date.now() - 1000 * 60 * 60 * 2, // 2 hours ago
    isRead: true,
    isStarred: false,
    labels: ["Work"],
    attachments: [{ filename: "q1-roadmap.pdf" }],
  },
  {
    _id: "4",
    from: { name: "Stripe", address: "receipts@stripe.com" },
    subject: "Your receipt from hustlemail",
    snippet: "Receipt #4892-1234. Amount paid: $29.00. Thank you for your payment.",
    date: Date.now() - 1000 * 60 * 60 * 5, // 5 hours ago
    isRead: true,
    isStarred: false,
    labels: [],
    attachments: [{ filename: "receipt.pdf" }],
  },
  {
    _id: "5",
    from: { name: "Linear", address: "notifications@linear.app" },
    subject: "Issue CM-127 assigned to you",
    snippet: "[hustlemail] Implement rate limiting for outbound emails. Priority: High. Assignee: You",
    date: Date.now() - 1000 * 60 * 60 * 8, // 8 hours ago
    isRead: true,
    isStarred: true,
    labels: ["Work", "Important"],
    attachments: [],
  },
  {
    _id: "6",
    from: { name: "npm", address: "support@npmjs.com" },
    subject: "New login to your npm account",
    snippet: "A new login was detected on your npm account from San Francisco, CA. If this wasn't you...",
    date: Date.now() - 1000 * 60 * 60 * 24, // 1 day ago
    isRead: true,
    isStarred: false,
    labels: [],
    attachments: [],
  },
  {
    _id: "7",
    from: { name: "Sarah Chen", address: "sarah@startup.io" },
    subject: "Partnership opportunity",
    snippet: "Hi! I'm the founder of StartupIO and I came across hustlemail. I'd love to explore a potential integration...",
    date: Date.now() - 1000 * 60 * 60 * 48, // 2 days ago
    isRead: true,
    isStarred: true,
    labels: ["Important"],
    attachments: [],
  },
  {
    _id: "8",
    from: { name: "Postmark", address: "support@postmarkapp.com" },
    subject: "Your weekly email report",
    snippet: "Here's your weekly email sending summary: 1,247 emails sent, 98.2% delivered, 0.3% bounced...",
    date: Date.now() - 1000 * 60 * 60 * 72, // 3 days ago
    isRead: true,
    isStarred: false,
    labels: ["Updates"],
    attachments: [],
  },
];

/**
 * Inbox page component with message list and controls.
 * @returns The inbox page element.
 */
export default function InboxPage() {
  const router = useRouter();
  const [messages, setMessages] = useState(mockMessages);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate refresh
    await new Promise((r) => setTimeout(r, 500));
    setIsRefreshing(false);
  };

  const handleSelect = (id: string) => {
    router.push(`/mail/${id}`);
  };

  const handleStar = (id: string) => {
    setMessages((prev) =>
      prev.map((m) => (m._id === id ? { ...m, isStarred: !m.isStarred } : m))
    );
  };

  const handleArchive = (id: string) => {
    setMessages((prev) => prev.filter((m) => m._id !== id));
  };

  const handleDelete = (id: string) => {
    setMessages((prev) => prev.filter((m) => m._id !== id));
  };

  const handleMarkRead = (id: string, read: boolean) => {
    setMessages((prev) =>
      prev.map((m) => (m._id === id ? { ...m, isRead: read } : m))
    );
  };

  const unreadCount = messages.filter((m) => !m.isRead).length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-4 px-4 py-3 border-b shrink-0">
        <div>
          <h1 className="text-lg font-semibold">Inbox</h1>
          <p className="text-xs text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
          </p>
        </div>

        <div className="flex-1" />

        <Button
          variant="ghost"
          size="icon"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw
            className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
          />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Filter by</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>All messages</DropdownMenuItem>
            <DropdownMenuItem>Unread only</DropdownMenuItem>
            <DropdownMenuItem>Starred</DropdownMenuItem>
            <DropdownMenuItem>Has attachments</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Display</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Comfortable</DropdownMenuItem>
            <DropdownMenuItem>Compact</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="flex items-center gap-4 px-4 py-2 bg-muted/30 border-b text-xs text-muted-foreground shrink-0">
        <span>
          <kbd className="kbd">J</kbd>/<kbd className="kbd">K</kbd> navigate
        </span>
        <span>
          <kbd className="kbd">E</kbd> archive
        </span>
        <span>
          <kbd className="kbd">S</kbd> star
        </span>
        <span>
          <kbd className="kbd">Enter</kbd> open
        </span>
        <span>
          <kbd className="kbd">C</kbd> compose
        </span>
      </div>

      {/* Message list */}
      <ScrollArea className="flex-1">
        <MessageList
          messages={messages}
          onSelect={handleSelect}
          onStar={handleStar}
          onArchive={handleArchive}
          onDelete={handleDelete}
          onMarkRead={handleMarkRead}
        />
      </ScrollArea>
    </div>
  );
}
