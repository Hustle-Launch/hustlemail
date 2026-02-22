/**
 * Settings page for domain and account configuration.
 * @module app/(private)/dashboard/settings/page
 */

"use client";

import { useState } from "react";
import {
  Settings,
  Key,
  Bell,
  Shield,
  Code,
  Trash,
  Copy,
  Check,
  Eye,
  EyeOff,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const [showApiKey, setShowApiKey] = useState(false);
  const [copied, setCopied] = useState(false);

  const apiKey = "cm_live_abc123def456ghi789jkl012";

  const copyApiKey = () => {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-white">Settings</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Manage your account and API access
        </p>
      </div>

      {/* API Keys */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10">
            <Key className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-lg font-medium text-white">API Keys</h2>
            <p className="text-sm text-zinc-400">
              Manage your API keys for programmatic access
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div className="rounded-lg bg-zinc-800 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">Live API Key</p>
                <p className="mt-1 text-xs text-zinc-500">
                  Created Jan 15, 2026
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="p-2 text-zinc-400 hover:text-white"
                >
                  {showApiKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
                <button
                  onClick={copyApiKey}
                  className="p-2 text-zinc-400 hover:text-white"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            <div className="mt-3">
              <code className="text-sm text-zinc-300">
                {showApiKey ? apiKey : "cm_live_••••••••••••••••••••"}
              </code>
            </div>
          </div>

          <Button variant="outline" size="sm">
            Generate New Key
          </Button>
        </div>
      </section>

      {/* Notifications */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10">
            <Bell className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-lg font-medium text-white">Notifications</h2>
            <p className="text-sm text-zinc-400">
              Configure how you receive alerts
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {[
            { id: "email", label: "Email notifications", description: "Receive important updates via email", checked: true },
            { id: "spam", label: "Spam alerts", description: "Get notified about spam attacks", checked: true },
            { id: "digest", label: "Weekly digest", description: "Summary of your email activity", checked: false },
          ].map((item) => (
            <label
              key={item.id}
              className="flex items-center justify-between rounded-lg bg-zinc-800 p-4"
            >
              <div>
                <p className="text-sm font-medium text-white">{item.label}</p>
                <p className="mt-0.5 text-xs text-zinc-500">{item.description}</p>
              </div>
              <input
                type="checkbox"
                defaultChecked={item.checked}
                className="h-4 w-4 rounded border-zinc-600 bg-zinc-700 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-zinc-900"
              />
            </label>
          ))}
        </div>
      </section>

      {/* Security */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10">
            <Shield className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-lg font-medium text-white">Security</h2>
            <p className="text-sm text-zinc-400">
              Protect your account
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between rounded-lg bg-zinc-800 p-4">
            <div>
              <p className="text-sm font-medium text-white">Two-factor authentication</p>
              <p className="mt-0.5 text-xs text-zinc-500">Add an extra layer of security</p>
            </div>
            <Button variant="outline" size="sm">
              Enable
            </Button>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-zinc-800 p-4">
            <div>
              <p className="text-sm font-medium text-white">Active sessions</p>
              <p className="mt-0.5 text-xs text-zinc-500">Manage your logged-in devices</p>
            </div>
            <Button variant="outline" size="sm">
              View
            </Button>
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10">
            <Code className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-lg font-medium text-white">Integrations</h2>
            <p className="text-sm text-zinc-400">
              Connect external services
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between rounded-lg bg-zinc-800 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-zinc-700">
                <span className="text-sm">📧</span>
              </div>
              <div>
                <p className="text-sm font-medium text-white">Resend</p>
                <p className="mt-0.5 text-xs text-emerald-400">Connected</p>
              </div>
            </div>
            <Button variant="outline" size="sm">
              Configure
            </Button>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-zinc-800 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-zinc-700">
                <span className="text-sm">🤖</span>
              </div>
              <div>
                <p className="text-sm font-medium text-white">OpenRouter</p>
                <p className="mt-0.5 text-xs text-zinc-500">Not connected</p>
              </div>
            </div>
            <Button variant="outline" size="sm">
              Connect
            </Button>
          </div>
        </div>
      </section>

      {/* Danger Zone */}
      <section className="rounded-xl border border-red-900/50 bg-red-950/20 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
            <Trash className="h-5 w-5 text-red-400" />
          </div>
          <div>
            <h2 className="text-lg font-medium text-white">Danger Zone</h2>
            <p className="text-sm text-zinc-400">
              Irreversible actions
            </p>
          </div>
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between rounded-lg bg-zinc-900 p-4">
            <div>
              <p className="text-sm font-medium text-white">Delete account</p>
              <p className="mt-0.5 text-xs text-zinc-500">
                Permanently delete your account and all data
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-red-800 text-red-400 hover:bg-red-950"
            >
              Delete Account
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
