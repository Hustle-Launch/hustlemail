import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CodeMail - Email Infrastructure That Lives in Your GitHub Repo",
  description:
    "Version-controlled email infrastructure. Write mail.config.ts, push to GitHub, email works. Real-time sync, AI spam detection, unlimited mailboxes.",
  keywords: [
    "email",
    "infrastructure",
    "developer",
    "git",
    "github",
    "config as code",
    "smtp",
    "imap",
  ],
  openGraph: {
    title: "CodeMail - Email Infrastructure That Lives in Your GitHub Repo",
    description:
      "Version-controlled email infrastructure. Write mail.config.ts, push to GitHub, email works.",
    type: "website",
    siteName: "CodeMail",
  },
  twitter: {
    card: "summary_large_image",
    title: "CodeMail - Email Infrastructure That Lives in Your GitHub Repo",
    description:
      "Version-controlled email infrastructure. Write mail.config.ts, push to GitHub, email works.",
  },
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#09090b]">
      {/* Gradient orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#6366f1]/20 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-[#4f46e5]/10 rounded-full blur-[100px]" />
      </div>

      {/* Grid background */}
      <div
        className="fixed inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(99, 102, 241, 0.03) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(99, 102, 241, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: "64px 64px",
        }}
      />

      <div className="relative">{children}</div>
    </div>
  );
}
