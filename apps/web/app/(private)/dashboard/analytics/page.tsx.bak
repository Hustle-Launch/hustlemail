/**
 * Analytics page showing email statistics.
 * @module app/(private)/dashboard/analytics/page
 */

"use client";

import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Envelope,
  Shield,
  PaperPlaneTilt,
  Inbox,
} from "@phosphor-icons/react";

// Mock data
const stats = [
  {
    name: "Total Received",
    value: "1,234",
    change: "+12%",
    trend: "up",
    icon: Inbox,
  },
  {
    name: "Total Sent",
    value: "567",
    change: "+8%",
    trend: "up",
    icon: PaperPlaneTilt,
  },
  {
    name: "Spam Blocked",
    value: "89",
    change: "-23%",
    trend: "down",
    icon: Shield,
  },
  {
    name: "Avg Response Time",
    value: "2.4h",
    change: "-15%",
    trend: "down",
    icon: Envelope,
  },
];

const weeklyData = [
  { day: "Mon", received: 145, sent: 67, spam: 12 },
  { day: "Tue", received: 189, sent: 89, spam: 15 },
  { day: "Wed", received: 201, sent: 102, spam: 8 },
  { day: "Thu", received: 178, sent: 78, spam: 22 },
  { day: "Fri", received: 234, sent: 134, spam: 19 },
  { day: "Sat", received: 98, sent: 34, spam: 5 },
  { day: "Sun", received: 67, sent: 23, spam: 8 },
];

const topSenders = [
  { email: "github.com", count: 89 },
  { email: "stripe.com", count: 67 },
  { email: "vercel.com", count: 45 },
  { email: "slack.com", count: 34 },
  { email: "linear.app", count: 28 },
];

export default function AnalyticsPage() {
  const maxReceived = Math.max(...weeklyData.map((d) => d.received));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-white">Analytics</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Email activity and performance metrics
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6"
          >
            <div className="flex items-center justify-between">
              <stat.icon className="h-5 w-5 text-zinc-400" />
              <span
                className={`flex items-center gap-1 text-sm ${
                  stat.trend === "up" ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {stat.trend === "up" ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                {stat.change}
              </span>
            </div>
            <p className="mt-4 text-3xl font-semibold text-white">
              {stat.value}
            </p>
            <p className="mt-1 text-sm text-zinc-500">{stat.name}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-3 gap-6">
        {/* Weekly activity chart */}
        <div className="col-span-2 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <h3 className="text-lg font-medium text-white">Weekly Activity</h3>
          <p className="mt-1 text-sm text-zinc-500">
            Email volume over the past 7 days
          </p>

          <div className="mt-6 flex items-end gap-4">
            {weeklyData.map((day) => (
              <div key={day.day} className="flex-1">
                <div className="flex flex-col items-center gap-2">
                  {/* Bar */}
                  <div className="relative h-40 w-full">
                    <div
                      className="absolute bottom-0 w-full rounded-t bg-indigo-600"
                      style={{
                        height: `${(day.received / maxReceived) * 100}%`,
                      }}
                    />
                    <div
                      className="absolute bottom-0 w-full rounded-t bg-indigo-400/50"
                      style={{
                        height: `${(day.sent / maxReceived) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs text-zinc-500">{day.day}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-6">
            <span className="flex items-center gap-2 text-sm text-zinc-400">
              <span className="h-3 w-3 rounded bg-indigo-600" />
              Received
            </span>
            <span className="flex items-center gap-2 text-sm text-zinc-400">
              <span className="h-3 w-3 rounded bg-indigo-400/50" />
              Sent
            </span>
          </div>
        </div>

        {/* Top senders */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <h3 className="text-lg font-medium text-white">Top Senders</h3>
          <p className="mt-1 text-sm text-zinc-500">
            Most frequent email sources
          </p>

          <div className="mt-6 space-y-4">
            {topSenders.map((sender, i) => (
              <div key={sender.email} className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded bg-zinc-800 text-xs text-zinc-400">
                  {i + 1}
                </span>
                <span className="flex-1 truncate text-sm text-white">
                  {sender.email}
                </span>
                <span className="text-sm text-zinc-500">{sender.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Spam breakdown */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h3 className="text-lg font-medium text-white">Spam Analysis</h3>
        <p className="mt-1 text-sm text-zinc-500">
          Breakdown of blocked messages
        </p>

        <div className="mt-6 grid grid-cols-4 gap-4">
          {[
            { category: "Marketing", count: 34, percent: 38 },
            { category: "Phishing", count: 23, percent: 26 },
            { category: "Scam", count: 18, percent: 20 },
            { category: "Other", count: 14, percent: 16 },
          ].map((item) => (
            <div key={item.category} className="rounded-lg bg-zinc-800 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400">{item.category}</span>
                <span className="text-sm text-zinc-500">{item.percent}%</span>
              </div>
              <p className="mt-2 text-2xl font-semibold text-white">
                {item.count}
              </p>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-zinc-700">
                <div
                  className="h-full bg-red-500"
                  style={{ width: `${item.percent}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
