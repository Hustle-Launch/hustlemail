/**
 * Dashboard page displaying domain management.
 * Shows domain cards with DNS status and statistics.
 * @module app/(private)/dashboard/page
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Globe,
  CheckCircle,
  AlertCircle,
  Clock,
  MoreVertical,
  ExternalLink,
  Settings,
  Trash,
  Mail,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** Mock domain data for demo - replace with Convex query in production. */
const mockDomains = [
  {
    id: "1",
    name: "mycompany.com",
    status: "active",
    mailboxes: 5,
    messagesThisWeek: 234,
    createdAt: "2026-01-15",
    dnsStatus: {
      mx: true,
      spf: true,
      dkim: true,
      dmarc: false,
    },
  },
  {
    id: "2",
    name: "startup.io",
    status: "pending",
    mailboxes: 2,
    messagesThisWeek: 0,
    createdAt: "2026-02-10",
    dnsStatus: {
      mx: false,
      spf: false,
      dkim: false,
      dmarc: false,
    },
  },
];

/**
 * Status badge for domain verification state.
 * @param status - Domain status (active, pending, error).
 * @returns Colored badge with icon.
 */
function StatusBadge({ status }: { status: string }) {
  if (status === "active") {
    return (
      <span className="flex items-center gap-1 text-sm text-emerald-400">
        <CheckCircle className="h-4 w-4" />
        Active
      </span>
    );
  }
  if (status === "pending") {
    return (
      <span className="flex items-center gap-1 text-sm text-amber-400">
        <Clock className="h-4 w-4" />
        Pending DNS
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-sm text-red-400">
      <AlertCircle className="h-4 w-4" />
      Error
    </span>
  );
}

/**
 * DNS record status indicator dot.
 * @param configured - Whether the record is configured.
 * @returns Colored dot element.
 */
function DnsStatusDot({ configured }: { configured: boolean }) {
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ${
        configured ? "bg-emerald-500" : "bg-zinc-600"
      }`}
    />
  );
}

/**
 * Dashboard/Domains page component.
 * @returns The domains management page.
 */
export default function DomainsPage() {
  const [domains] = useState(mockDomains);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-white">Domains</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Manage your email domains and DNS configuration
        </p>
      </div>

      {/* Domain cards */}
      <div className="grid gap-4">
        {domains.map((domain) => (
          <div
            key={domain.id}
            className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 transition-colors hover:border-zinc-700"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-500/10">
                  <Globe className="h-6 w-6 text-indigo-400" />
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-medium text-white">
                      {domain.name}
                    </h3>
                    <StatusBadge status={domain.status} />
                  </div>
                  <p className="mt-1 text-sm text-zinc-500">
                    Added {new Date(domain.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-zinc-400">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open Web Mail
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    Domain Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-red-400">
                    <Trash className="mr-2 h-4 w-4" />
                    Delete Domain
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Stats */}
            <div className="mt-6 grid grid-cols-4 gap-4">
              <div className="rounded-lg bg-zinc-800/50 p-3">
                <div className="flex items-center gap-2 text-zinc-400">
                  <Mail className="h-4 w-4" />
                  <span className="text-xs uppercase tracking-wide">
                    Mailboxes
                  </span>
                </div>
                <p className="mt-1 text-2xl font-semibold text-white">
                  {domain.mailboxes}
                </p>
              </div>
              <div className="rounded-lg bg-zinc-800/50 p-3">
                <div className="flex items-center gap-2 text-zinc-400">
                  <Mail className="h-4 w-4" />
                  <span className="text-xs uppercase tracking-wide">
                    This Week
                  </span>
                </div>
                <p className="mt-1 text-2xl font-semibold text-white">
                  {domain.messagesThisWeek}
                </p>
              </div>
              <div className="col-span-2 rounded-lg bg-zinc-800/50 p-3">
                <div className="flex items-center gap-2 text-zinc-400">
                  <Shield className="h-4 w-4" />
                  <span className="text-xs uppercase tracking-wide">
                    DNS Records
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-4">
                  <span className="flex items-center gap-1.5 text-sm text-zinc-300">
                    <DnsStatusDot configured={domain.dnsStatus.mx} />
                    MX
                  </span>
                  <span className="flex items-center gap-1.5 text-sm text-zinc-300">
                    <DnsStatusDot configured={domain.dnsStatus.spf} />
                    SPF
                  </span>
                  <span className="flex items-center gap-1.5 text-sm text-zinc-300">
                    <DnsStatusDot configured={domain.dnsStatus.dkim} />
                    DKIM
                  </span>
                  <span className="flex items-center gap-1.5 text-sm text-zinc-300">
                    <DnsStatusDot configured={domain.dnsStatus.dmarc} />
                    DMARC
                  </span>
                  {domain.status === "pending" && (
                    <Link
                      href={`/dashboard/domains/${domain.id}/dns`}
                      className="ml-auto text-sm text-indigo-400 hover:underline"
                    >
                      Configure DNS →
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {domains.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 py-16">
          <Globe className="h-12 w-12 text-zinc-600" />
          <h3 className="mt-4 text-lg font-medium text-white">No domains yet</h3>
          <p className="mt-1 text-sm text-zinc-500">
            Add your first domain to get started
          </p>
          <Link
            href="/dashboard/domains/new"
            className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
          >
            Add Domain
          </Link>
        </div>
      )}
    </div>
  );
}
