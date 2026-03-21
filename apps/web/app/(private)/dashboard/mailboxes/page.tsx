/**
 * Mailboxes management page.
 * @module app/(private)/dashboard/mailboxes/page
 */

"use client";

import { useState } from "react";
import {
  Mail,
  Plus,
  MoreVertical,
  Users,
  User,
  Forward,
  Trash,
  Settings,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

// Mock data - replace with Convex query
const mockMailboxes = [
  {
    id: "1",
    name: "support",
    domain: "mycompany.com",
    type: "shared" as const,
    members: ["alice@mycompany.com", "bob@mycompany.com"],
    messagesThisWeek: 145,
    unread: 12,
  },
  {
    id: "2",
    name: "team",
    domain: "mycompany.com",
    type: "shared" as const,
    members: ["alice@mycompany.com", "bob@mycompany.com", "carol@mycompany.com"],
    messagesThisWeek: 67,
    unread: 3,
  },
  {
    id: "3",
    name: "alice",
    domain: "mycompany.com",
    type: "personal" as const,
    members: ["alice@mycompany.com"],
    messagesThisWeek: 22,
    unread: 0,
  },
  {
    id: "4",
    name: "info",
    domain: "mycompany.com",
    type: "alias" as const,
    forwardTo: ["support@mycompany.com"],
    messagesThisWeek: 89,
    unread: 0,
  },
];

function TypeBadge({ type }: { type: "shared" | "personal" | "alias" }) {
  const config = {
    shared: { icon: Users, label: "Shared", color: "text-indigo-400 bg-indigo-500/10" },
    personal: { icon: User, label: "Personal", color: "text-emerald-400 bg-emerald-500/10" },
    alias: { icon: Forward, label: "Alias", color: "text-amber-400 bg-amber-500/10" },
  };
  const { icon: Icon, label, color } = config[type];
  return (
    <span className={cn("flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium", color)}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

export default function MailboxesPage() {
  const [mailboxes] = useState(mockMailboxes);
  const [search, setSearch] = useState("");

  const filteredMailboxes = mailboxes.filter(
    (mb) =>
      mb.name.toLowerCase().includes(search.toLowerCase()) ||
      mb.domain.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Mailboxes</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Manage email addresses across your domains
          </p>
        </div>
        <Button className="bg-indigo-600 hover:bg-indigo-500">
          <Plus className="mr-2 h-4 w-4" />
          New Mailbox
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <Input
          type="text"
          placeholder="Search mailboxes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-zinc-900 pl-10"
        />
      </div>

      {/* Mailbox list */}
      <div className="rounded-xl border border-zinc-800">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-800 text-left text-sm text-zinc-400">
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Members / Forward</th>
              <th className="px-4 py-3 font-medium text-right">This Week</th>
              <th className="px-4 py-3 font-medium text-right">Unread</th>
              <th className="w-12"></th>
            </tr>
          </thead>
          <tbody>
            {filteredMailboxes.map((mb) => (
              <tr
                key={mb.id}
                className="border-b border-zinc-800/50 transition-colors hover:bg-zinc-900/50"
              >
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-800">
                      <Mail className="h-4 w-4 text-zinc-400" />
                    </div>
                    <span className="font-medium text-white">
                      {mb.name}@{mb.domain}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <TypeBadge type={mb.type} />
                </td>
                <td className="px-4 py-4 text-sm text-zinc-400">
                  {mb.type === "alias"
                    ? `→ ${mb.forwardTo?.join(", ")}`
                    : `${mb.members?.length || 0} member${(mb.members?.length || 0) !== 1 ? "s" : ""}`}
                </td>
                <td className="px-4 py-4 text-right text-sm text-zinc-300">
                  {mb.messagesThisWeek}
                </td>
                <td className="px-4 py-4 text-right">
                  {mb.unread > 0 ? (
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-600 px-1.5 text-xs font-medium text-white">
                      {mb.unread}
                    </span>
                  ) : (
                    <span className="text-sm text-zinc-500">—</span>
                  )}
                </td>
                <td className="px-4 py-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-zinc-400">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem>
                        <Mail className="mr-2 h-4 w-4" />
                        Open Inbox
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-red-400">
                        <Trash className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
