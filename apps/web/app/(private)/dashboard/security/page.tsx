/**
 * Security settings page for domain authentication.
 * @module app/(private)/dashboard/security/page
 */

"use client";

import {
  Shield,
  Key,
  Lock,
  Warning,
  CheckCircle,
  XCircle,
  ArrowClockwise,
  ExternalLink,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Mock data
const securityChecks = [
  {
    id: "dkim",
    name: "DKIM Signing",
    description: "All outbound emails are signed with DKIM",
    status: "pass",
    lastChecked: "2 hours ago",
  },
  {
    id: "spf",
    name: "SPF Record",
    description: "Sender Policy Framework is configured correctly",
    status: "pass",
    lastChecked: "2 hours ago",
  },
  {
    id: "dmarc",
    name: "DMARC Policy",
    description: "Domain-based Message Authentication configured",
    status: "warning",
    message: "Consider upgrading from p=none to p=quarantine",
    lastChecked: "2 hours ago",
  },
  {
    id: "tls",
    name: "TLS Encryption",
    description: "All connections use TLS 1.3",
    status: "pass",
    lastChecked: "2 hours ago",
  },
];

const recentThreats = [
  {
    id: "1",
    type: "Phishing",
    from: "security@amaz0n-support.com",
    subject: "Your account has been compromised",
    blockedAt: "10 minutes ago",
  },
  {
    id: "2",
    type: "Spam",
    from: "offers@crypto-gains.xyz",
    subject: "🚀 Make $10,000 TODAY!",
    blockedAt: "1 hour ago",
  },
  {
    id: "3",
    type: "Malware",
    from: "invoice@billing-dept.net",
    subject: "Invoice #INV-2026-001.exe",
    blockedAt: "3 hours ago",
  },
];

function StatusIcon({ status }: { status: string }) {
  if (status === "pass") {
    return <CheckCircle className="h-5 w-5 text-emerald-400" />;
  }
  if (status === "warning") {
    return <Warning className="h-5 w-5 text-amber-400" />;
  }
  return <XCircle className="h-5 w-5 text-red-400" />;
}

export default function SecurityPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Security</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Monitor threats and security configuration
          </p>
        </div>
        <Button variant="outline">
          <ArrowClockwise className="mr-2 h-4 w-4" />
          Run Security Scan
        </Button>
      </div>

      {/* Security score */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <div className="flex items-center gap-6">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-emerald-500/10">
            <span className="text-3xl font-bold text-emerald-400">A</span>
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-white">
              Security Score: Excellent
            </h2>
            <p className="mt-1 text-zinc-400">
              Your email security configuration is strong with minor
              recommendations
            </p>
            <div className="mt-3 flex items-center gap-4">
              <span className="flex items-center gap-1 text-sm text-emerald-400">
                <CheckCircle className="h-4 w-4" />3 checks passed
              </span>
              <span className="flex items-center gap-1 text-sm text-amber-400">
                <Warning className="h-4 w-4" />1 warning
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Security checks */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h3 className="text-lg font-medium text-white">Security Checks</h3>
        <p className="mt-1 text-sm text-zinc-500">
          Automated verification of your email security
        </p>

        <div className="mt-6 space-y-4">
          {securityChecks.map((check) => (
            <div
              key={check.id}
              className={cn(
                "rounded-lg border p-4",
                check.status === "pass"
                  ? "border-emerald-500/20 bg-emerald-500/5"
                  : check.status === "warning"
                    ? "border-amber-500/20 bg-amber-500/5"
                    : "border-red-500/20 bg-red-500/5"
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <StatusIcon status={check.status} />
                  <div>
                    <p className="font-medium text-white">{check.name}</p>
                    <p className="mt-0.5 text-sm text-zinc-400">
                      {check.description}
                    </p>
                    {check.message && (
                      <p className="mt-2 text-sm text-amber-300">
                        {check.message}
                      </p>
                    )}
                  </div>
                </div>
                <span className="text-xs text-zinc-500">
                  {check.lastChecked}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent threats */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-white">Recent Threats</h3>
            <p className="mt-1 text-sm text-zinc-500">
              Blocked malicious emails
            </p>
          </div>
          <Button variant="ghost" size="sm">
            View All
            <ExternalLink className="ml-2 h-4 w-4" />
          </Button>
        </div>

        <div className="mt-6 space-y-3">
          {recentThreats.map((threat) => (
            <div
              key={threat.id}
              className="flex items-center justify-between rounded-lg bg-zinc-800 p-4"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
                  <Shield className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-400">
                      {threat.type}
                    </span>
                    <span className="text-sm text-white">{threat.subject}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    From: {threat.from}
                  </p>
                </div>
              </div>
              <span className="text-xs text-zinc-500">{threat.blockedAt}</span>
            </div>
          ))}
        </div>
      </div>

      {/* DKIM Keys */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10">
            <Key className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-white">DKIM Keys</h3>
            <p className="text-sm text-zinc-400">
              Manage your domain signing keys
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between rounded-lg bg-zinc-800 p-4">
            <div>
              <p className="text-sm font-medium text-white">Primary Key</p>
              <p className="mt-0.5 text-xs text-zinc-500">
                Created Jan 15, 2026 • 2048-bit RSA
              </p>
            </div>
            <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
              Active
            </span>
          </div>

          <Button variant="outline" size="sm">
            <ArrowClockwise className="mr-2 h-4 w-4" />
            Rotate Key
          </Button>
        </div>
      </div>
    </div>
  );
}
