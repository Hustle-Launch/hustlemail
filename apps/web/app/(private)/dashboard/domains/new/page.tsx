/**
 * New domain creation page.
 * @module app/(private)/dashboard/domains/new/page
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Globe,
  ArrowRight,
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  Loader2,
  Terminal,
  Mail,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Step = "domain" | "mailboxes" | "dns" | "verify" | "complete";

const steps: { id: Step; name: string }[] = [
  { id: "domain", name: "Domain" },
  { id: "mailboxes", name: "Mailboxes" },
  { id: "dns", name: "DNS Records" },
  { id: "verify", name: "Verify" },
  { id: "complete", name: "Complete" },
];

export default function NewDomainPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>("domain");
  const [domain, setDomain] = useState("");
  const [mailboxes, setMailboxes] = useState([
    { name: "support", type: "shared" },
    { name: "team", type: "shared" },
  ]);
  const [newMailbox, setNewMailbox] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [copiedRecord, setCopiedRecord] = useState<string | null>(null);

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);

  const dnsRecords = [
    {
      id: "mx",
      type: "MX",
      host: "@",
      value: `mail.${domain || "yourdomain.com"}`,
      priority: "10",
    },
    {
      id: "spf",
      type: "TXT",
      host: "@",
      value: "v=spf1 include:_spf.resend.com ~all",
    },
    {
      id: "dkim",
      type: "TXT",
      host: "hustlemail._domainkey",
      value: "v=DKIM1; k=rsa; p=MIGfMA0GCSq...(truncated)",
    },
    {
      id: "dmarc",
      type: "TXT",
      host: "_dmarc",
      value: `v=DMARC1; p=none; rua=mailto:dmarc@${domain || "yourdomain.com"}`,
    },
  ];

  const copyToClipboard = (record: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedRecord(record);
    setTimeout(() => setCopiedRecord(null), 2000);
  };

  const addMailbox = () => {
    if (newMailbox && !mailboxes.find((m) => m.name === newMailbox)) {
      setMailboxes([...mailboxes, { name: newMailbox, type: "personal" }]);
      setNewMailbox("");
    }
  };

  const removeMailbox = (name: string) => {
    setMailboxes(mailboxes.filter((m) => m.name !== name));
  };

  const handleVerify = async () => {
    setIsVerifying(true);
    // Simulate verification
    await new Promise((r) => setTimeout(r, 2000));
    setIsVerifying(false);
    setCurrentStep("complete");
  };

  const nextStep = () => {
    const idx = currentStepIndex;
    if (idx < steps.length - 1) {
      setCurrentStep(steps[idx + 1].id);
    }
  };

  const prevStep = () => {
    const idx = currentStepIndex;
    if (idx > 0) {
      setCurrentStep(steps[idx - 1].id);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* Progress */}
      <div className="flex items-center justify-between">
        {steps.map((step, idx) => (
          <div key={step.id} className="flex items-center">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium",
                idx < currentStepIndex
                  ? "bg-indigo-600 text-white"
                  : idx === currentStepIndex
                    ? "bg-indigo-600 text-white"
                    : "bg-zinc-800 text-zinc-500"
              )}
            >
              {idx < currentStepIndex ? (
                <Check className="h-4 w-4" />
              ) : (
                idx + 1
              )}
            </div>
            <span
              className={cn(
                "ml-2 text-sm",
                idx <= currentStepIndex ? "text-white" : "text-zinc-500"
              )}
            >
              {step.name}
            </span>
            {idx < steps.length - 1 && (
              <div
                className={cn(
                  "mx-4 h-px w-8",
                  idx < currentStepIndex ? "bg-indigo-600" : "bg-zinc-800"
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8">
        {/* Domain step */}
        {currentStep === "domain" && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10">
                <Globe className="h-5 w-5 text-indigo-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">
                  Enter your domain
                </h2>
                <p className="text-sm text-zinc-400">
                  The domain you want to receive email on
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Input
                type="text"
                placeholder="mycompany.com"
                value={domain}
                onChange={(e) => setDomain(e.target.value.toLowerCase())}
                className="h-12 bg-zinc-800 text-lg"
              />
              <p className="text-xs text-zinc-500">
                Enter the root domain without www or subdomains
              </p>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={nextStep}
                disabled={!domain}
                className="bg-indigo-600 hover:bg-indigo-500"
              >
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Mailboxes step */}
        {currentStep === "mailboxes" && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10">
                <Users className="h-5 w-5 text-indigo-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">
                  Configure mailboxes
                </h2>
                <p className="text-sm text-zinc-400">
                  Set up the email addresses you need
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {mailboxes.map((mb) => (
                <div
                  key={mb.name}
                  className="flex items-center justify-between rounded-lg bg-zinc-800 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-zinc-400" />
                    <span className="text-white">
                      {mb.name}@{domain}
                    </span>
                    <span className="rounded bg-zinc-700 px-2 py-0.5 text-xs text-zinc-400">
                      {mb.type}
                    </span>
                  </div>
                  <button
                    onClick={() => removeMailbox(mb.name)}
                    className="text-sm text-zinc-500 hover:text-red-400"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Add mailbox name"
                value={newMailbox}
                onChange={(e) => setNewMailbox(e.target.value.toLowerCase())}
                onKeyDown={(e) => e.key === "Enter" && addMailbox()}
                className="bg-zinc-800"
              />
              <Button onClick={addMailbox} variant="outline">
                Add
              </Button>
            </div>

            <div className="flex justify-between">
              <Button onClick={prevStep} variant="ghost">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={nextStep}
                disabled={mailboxes.length === 0}
                className="bg-indigo-600 hover:bg-indigo-500"
              >
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* DNS step */}
        {currentStep === "dns" && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10">
                <Terminal className="h-5 w-5 text-indigo-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">
                  Configure DNS records
                </h2>
                <p className="text-sm text-zinc-400">
                  Add these records to your DNS provider
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {dnsRecords.map((record) => (
                <div
                  key={record.id}
                  className="rounded-lg border border-zinc-800 bg-zinc-800/50 p-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded bg-indigo-500/10 px-2 py-0.5 text-sm font-medium text-indigo-400">
                      {record.type}
                    </span>
                    <button
                      onClick={() => copyToClipboard(record.id, record.value)}
                      className="flex items-center gap-1 text-sm text-zinc-400 hover:text-white"
                    >
                      {copiedRecord === record.id ? (
                        <>
                          <Check className="h-4 w-4 text-emerald-400" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                  <div className="mt-3 space-y-2">
                    <div className="flex">
                      <span className="w-20 text-sm text-zinc-500">Host:</span>
                      <code className="text-sm text-white">{record.host}</code>
                    </div>
                    <div className="flex">
                      <span className="w-20 text-sm text-zinc-500">Value:</span>
                      <code className="break-all text-sm text-white">
                        {record.value}
                      </code>
                    </div>
                    {record.priority && (
                      <div className="flex">
                        <span className="w-20 text-sm text-zinc-500">
                          Priority:
                        </span>
                        <code className="text-sm text-white">
                          {record.priority}
                        </code>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-lg bg-amber-500/10 p-4">
              <p className="text-sm text-amber-200">
                DNS changes can take up to 48 hours to propagate, but usually
                complete within 15 minutes.
              </p>
            </div>

            <div className="flex justify-between">
              <Button onClick={prevStep} variant="ghost">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={nextStep}
                className="bg-indigo-600 hover:bg-indigo-500"
              >
                I&apos;ve added the records
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Verify step */}
        {currentStep === "verify" && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10">
                <Check className="h-5 w-5 text-indigo-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">
                  Verify DNS configuration
                </h2>
                <p className="text-sm text-zinc-400">
                  We&apos;ll check that your DNS records are set up correctly
                </p>
              </div>
            </div>

            <div className="flex flex-col items-center py-8">
              {isVerifying ? (
                <>
                  <Loader2 className="h-12 w-12 animate-spin text-indigo-400" />
                  <p className="mt-4 text-zinc-400">Verifying DNS records...</p>
                </>
              ) : (
                <>
                  <p className="text-center text-zinc-400">
                    Click verify to check your DNS configuration
                  </p>
                  <Button
                    onClick={handleVerify}
                    className="mt-4 bg-indigo-600 hover:bg-indigo-500"
                  >
                    Verify DNS
                  </Button>
                </>
              )}
            </div>

            <div className="flex justify-start">
              <Button onClick={prevStep} variant="ghost" disabled={isVerifying}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </div>
          </div>
        )}

        {/* Complete step */}
        {currentStep === "complete" && (
          <div className="space-y-6 text-center">
            <div className="flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
                <Check className="h-8 w-8 text-emerald-400" />
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-white">
                You&apos;re all set!
              </h2>
              <p className="mt-2 text-zinc-400">
                {domain} is now configured and ready to receive email
              </p>
            </div>

            <div className="rounded-lg bg-zinc-800 p-4">
              <p className="text-sm text-zinc-400">Your mailboxes:</p>
              <div className="mt-2 space-y-1">
                {mailboxes.map((mb) => (
                  <p key={mb.name} className="text-white">
                    {mb.name}@{domain}
                  </p>
                ))}
              </div>
            </div>

            <div className="flex justify-center gap-4">
              <Button
                onClick={() => router.push("/mail/inbox")}
                className="bg-indigo-600 hover:bg-indigo-500"
              >
                <Mail className="mr-2 h-4 w-4" />
                Open Web Mail
              </Button>
              <Button
                onClick={() => router.push("/dashboard")}
                variant="outline"
              >
                Go to Dashboard
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
