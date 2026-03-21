/**
 * Public demo inbox route.
 * No auth required; seeded read-only data for sales/demo motion.
 */

type DemoMessage = {
  id: string;
  from: string;
  subject: string;
  snippet: string;
  when: string;
  tag?: "support" | "newsletter" | "spam";
};

const demoMessages: DemoMessage[] = [
  {
    id: "1",
    from: "Stripe Atlas <hello@stripe.com>",
    subject: "Your company formation docs are ready",
    snippet:
      "Congrats — your Delaware C-Corp documents are attached. Next: wire setup + EIN activation.",
    when: "8:02 AM",
    tag: "newsletter",
  },
  {
    id: "2",
    from: "Ava @ GreenField Tractor <ava@greenfieldtractor.com>",
    subject: "Re: Bulk quote for 3 compact tractors",
    snippet:
      "We can do $66,500 delivered for all three units. Lead time is 11 days from deposit.",
    when: "7:41 AM",
    tag: "support",
  },
  {
    id: "3",
    from: "GrowthHacker Pro <noreply@totally-legit-mail.biz>",
    subject: "🔥 10,000 B2B leads in 30 minutes (no opt-in needed)",
    snippet:
      "Limited offer! Send us your domain admin login and we'll supercharge your pipeline overnight.",
    when: "7:05 AM",
    tag: "spam",
  },
  {
    id: "4",
    from: "ShipStation <updates@shipstation.com>",
    subject: "Weekly logistics summary",
    snippet:
      "12 shipments delivered, avg transit 2.4 days, carrier spend down 8.1% week over week.",
    when: "Yesterday",
    tag: "newsletter",
  },
  {
    id: "5",
    from: "Jordan @ ACME Ventures <jordan@acme.vc>",
    subject: "Follow-up after your pitch",
    snippet:
      "Can you share activation + retention by cohort? We liked the product direction a lot.",
    when: "Yesterday",
    tag: "support",
  },
];

const dnsRows = [
  ["MX", "@", "mail.demo.codemail.dev", "10"],
  ["TXT", "@", "v=spf1 include:_spf.resend.com ~all", "-"],
  ["TXT", "codemail._domainkey", "v=DKIM1; k=rsa; p=<public-key>", "-"],
  ["TXT", "_dmarc", "v=DMARC1; p=none; rua=mailto:dmarc@demo.codemail.dev", "-"],
  ["CNAME", "mail", "codemail.app", "-"],
];

export default function DemoPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 md:px-6">
      <div className="mb-6 flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">CodeMail Live Demo</h1>
        <p className="text-sm text-muted-foreground">
          Public, no-login, read-only mailbox preview. This simulates a real founder inbox with support,
          newsletter, and spam traffic.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <section className="rounded-xl border bg-card">
          <div className="border-b px-4 py-3">
            <h2 className="font-medium">demo@demo.codemail.dev — Inbox (read-only)</h2>
            <p className="text-xs text-muted-foreground">5 seeded threads • mobile responsive • no auth wall</p>
          </div>
          <ul className="divide-y">
            {demoMessages.map((m) => (
              <li key={m.id} className="p-4 hover:bg-muted/40">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium">{m.subject}</p>
                  <span className="shrink-0 text-xs text-muted-foreground">{m.when}</span>
                </div>
                <p className="mb-1 truncate text-xs text-muted-foreground">{m.from}</p>
                <p className="text-sm text-foreground/90">{m.snippet}</p>
              </li>
            ))}
          </ul>
        </section>

        <aside className="space-y-6">
          <section className="rounded-xl border bg-card p-4">
            <h3 className="mb-2 text-sm font-semibold">What this demo proves</h3>
            <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
              <li>Inbox UX without login friction</li>
              <li>Realistic threaded business email samples</li>
              <li>Spam sample visible in-context</li>
              <li>Public DNS setup example for prospects</li>
            </ul>
          </section>

          <section className="rounded-xl border bg-card p-4">
            <h3 className="mb-2 text-sm font-semibold">Demo DNS records</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-muted-foreground">
                  <tr>
                    <th className="py-1 pr-3">Type</th>
                    <th className="py-1 pr-3">Host</th>
                    <th className="py-1 pr-3">Value</th>
                    <th className="py-1">Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {dnsRows.map((r) => (
                    <tr key={`${r[0]}-${r[1]}`} className="border-t align-top">
                      <td className="py-2 pr-3 font-mono">{r[0]}</td>
                      <td className="py-2 pr-3 font-mono">{r[1]}</td>
                      <td className="py-2 pr-3 font-mono">{r[2]}</td>
                      <td className="py-2 font-mono">{r[3]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
