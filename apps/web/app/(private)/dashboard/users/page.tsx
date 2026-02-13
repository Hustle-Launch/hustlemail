"use client";

import { useState } from "react";
import {
  Users,
  Plus,
  MoreVertical,
  Mail,
  Shield,
  Trash2,
  Settings,
  Search,
  Crown,
  User,
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

// Mock data
const mockUsers = [
  {
    id: "1",
    name: "Alice Smith",
    email: "alice@mycompany.com",
    role: "owner" as const,
    mailboxes: ["alice", "support", "team"],
    lastActive: "2 hours ago",
    avatar: null,
  },
  {
    id: "2",
    name: "Bob Johnson",
    email: "bob@mycompany.com",
    role: "admin" as const,
    mailboxes: ["bob", "support"],
    lastActive: "1 day ago",
    avatar: null,
  },
  {
    id: "3",
    name: "Carol Williams",
    email: "carol@mycompany.com",
    role: "member" as const,
    mailboxes: ["carol", "team"],
    lastActive: "Just now",
    avatar: null,
  },
];

function RoleBadge({ role }: { role: "owner" | "admin" | "member" }) {
  const config = {
    owner: {
      icon: Crown,
      label: "Owner",
      color: "text-amber-400 bg-amber-500/10",
    },
    admin: {
      icon: Shield,
      label: "Admin",
      color: "text-indigo-400 bg-indigo-500/10",
    },
    member: {
      icon: User,
      label: "Member",
      color: "text-zinc-400 bg-zinc-500/10",
    },
  };
  const { icon: Icon, label, color } = config[role];
  return (
    <span
      className={cn(
        "flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium",
        color
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-medium text-white">
      {initials}
    </div>
  );
}

export default function UsersPage() {
  const [users] = useState(mockUsers);
  const [search, setSearch] = useState("");

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Users</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Manage team members and permissions
          </p>
        </div>
        <Button className="bg-indigo-600 hover:bg-indigo-500">
          <Plus className="mr-2 h-4 w-4" />
          Invite User
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <Input
          type="text"
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-zinc-900 pl-10"
        />
      </div>

      {/* User list */}
      <div className="rounded-xl border border-zinc-800">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-800 text-left text-sm text-zinc-400">
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Mailboxes</th>
              <th className="px-4 py-3 font-medium">Last Active</th>
              <th className="w-12"></th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr
                key={user.id}
                className="border-b border-zinc-800/50 transition-colors hover:bg-zinc-900/50"
              >
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={user.name} />
                    <div>
                      <p className="font-medium text-white">{user.name}</p>
                      <p className="text-sm text-zinc-500">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <RoleBadge role={user.role} />
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap gap-1">
                    {user.mailboxes.slice(0, 3).map((mb) => (
                      <span
                        key={mb}
                        className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400"
                      >
                        {mb}
                      </span>
                    ))}
                    {user.mailboxes.length > 3 && (
                      <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-500">
                        +{user.mailboxes.length - 3}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4 text-sm text-zinc-400">
                  {user.lastActive}
                </td>
                <td className="px-4 py-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-zinc-400"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem>
                        <Mail className="mr-2 h-4 w-4" />
                        Send Email
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Settings className="mr-2 h-4 w-4" />
                        Edit Permissions
                      </DropdownMenuItem>
                      {user.role !== "owner" && (
                        <DropdownMenuItem className="text-red-400">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remove
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pending invites */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h3 className="text-lg font-medium text-white">Pending Invitations</h3>
        <p className="mt-1 text-sm text-zinc-500">
          Users who haven&apos;t accepted their invite yet
        </p>

        <div className="mt-4 flex items-center justify-center py-8 text-center">
          <div>
            <Users className="mx-auto h-8 w-8 text-zinc-600" />
            <p className="mt-2 text-sm text-zinc-500">No pending invitations</p>
          </div>
        </div>
      </div>
    </div>
  );
}
