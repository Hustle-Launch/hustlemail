/**
 * DNS verification API route.
 * Generates required DNS records and verifies current configuration.
 * @module app/api/dns/[domain]/route
 */

import { NextRequest, NextResponse } from "next/server";
import dns from "dns/promises";

/** MX record structure from dns.resolveMx */
interface MxRecord {
  exchange: string;
  priority: number;
}

/** Result of checking a single DNS record. */
interface DnsRecordCheck {
  type: string;
  host: string;
  expectedValue: string;
  actualValue?: string;
  status: "pass" | "fail" | "pending";
}

/**
 * GET handler for DNS record generation and verification.
 * @param request - The incoming request.
 * @param params - Route parameters containing the domain.
 * @returns JSON with required records, current checks, and verification status.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ domain: string }> }
) {
  const { domain } = await params;

  if (!domain || !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) {
    return NextResponse.json({ error: "Invalid domain" }, { status: 400 });
  }

  // Generate required DNS records
  const records = {
    mx: {
      type: "MX",
      host: "@",
      value: `10 mail.${domain}`,
      priority: 10,
      purpose: "Routes incoming email to hustlemail servers",
    },
    spf: {
      type: "TXT",
      host: "@",
      value: "v=spf1 include:_spf.resend.com ~all",
      purpose: "Authorizes hustlemail to send email on your behalf",
    },
    dkim: {
      type: "TXT",
      host: "hustlemail._domainkey",
      value: "v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBA...", // Placeholder - would be generated per domain
      purpose: "Signs outgoing emails to prevent spoofing",
    },
    dmarc: {
      type: "TXT",
      host: "_dmarc",
      value: `v=DMARC1; p=none; rua=mailto:dmarc@${domain}`,
      purpose: "Sets email authentication policy (optional but recommended)",
    },
    webmail: {
      type: "CNAME",
      host: "mail",
      value: "hustlemail.vercel.app",
      purpose: "Enables web mail access at mail.${domain}",
    },
  };

  // Verify current DNS configuration
  const checks: DnsRecordCheck[] = [];

  /**
   * Resolve DNS records with proper error discrimination.
   * Returns { data, error } where error contains code + message for non-NODATA failures.
   */
  async function resolveDns<T>(
    fn: () => Promise<T>,
    fallback: T
  ): Promise<{ data: T; error?: { code: string; message: string } }> {
    try {
      return { data: await fn() };
    } catch (err: unknown) {
      const code = (err as NodeJS.ErrnoException).code ?? "UNKNOWN";
      // NODATA / NOTFOUND = record simply doesn't exist yet
      if (code === "ENODATA" || code === "ENOTFOUND") {
        return { data: fallback };
      }
      // Temporary / server failures — surface to the user
      const messages: Record<string, string> = {
        SERVFAIL: "DNS server failed to respond — try again shortly",
        TIMEOUT: "DNS lookup timed out — try again shortly",
        CONNREFUSED: "Could not reach DNS server",
        FORMERR: "Malformed DNS query — check domain format",
      };
      return {
        data: fallback,
        error: { code, message: messages[code] ?? `DNS error: ${code}` },
      };
    }
  }

  // Check MX
  const mx = await resolveDns(() => dns.resolveMx(domain), [] as MxRecord[]);
  const hasMx = mx.data.some((r) => r.exchange.includes("mail." + domain));
  checks.push({
    type: "MX",
    host: domain,
    expectedValue: records.mx.value,
    actualValue: mx.error?.message ?? (mx.data.map((r) => `${r.priority} ${r.exchange}`).join(", ") || "Not set"),
    status: mx.error ? "fail" : hasMx ? "pass" : "fail",
  });

  // Check SPF
  const txt = await resolveDns(() => dns.resolveTxt(domain), [] as string[][]);
  const spfRecord = txt.data.flat().find((r) => r.startsWith("v=spf1"));
  const hasSpf = spfRecord?.includes("resend.com");
  checks.push({
    type: "TXT (SPF)",
    host: domain,
    expectedValue: records.spf.value,
    actualValue: txt.error?.message ?? spfRecord ?? "Not set",
    status: txt.error ? "fail" : hasSpf ? "pass" : "fail",
  });

  // Check DKIM
  const dkim = await resolveDns(() => dns.resolveTxt(`hustlemail._domainkey.${domain}`), [] as string[][]);
  const dkimRecord = dkim.data.flat().find((r) => r.startsWith("v=DKIM1"));
  checks.push({
    type: "TXT (DKIM)",
    host: `hustlemail._domainkey.${domain}`,
    expectedValue: records.dkim.value,
    actualValue: dkim.error?.message ?? dkimRecord ?? "Not set",
    status: dkim.error ? "fail" : dkimRecord ? "pass" : "fail",
  });

  // Check DMARC
  const dmarc = await resolveDns(() => dns.resolveTxt(`_dmarc.${domain}`), [] as string[][]);
  const dmarcRecord = dmarc.data.flat().find((r) => r.startsWith("v=DMARC1"));
  checks.push({
    type: "TXT (DMARC)",
    host: `_dmarc.${domain}`,
    expectedValue: records.dmarc.value,
    actualValue: dmarc.error?.message ?? dmarcRecord ?? "Not set",
    status: dmarc.error ? "fail" : dmarcRecord ? "pass" : "pending",
  });

  // Check CNAME for webmail
  const cname = await resolveDns(() => dns.resolveCname(`mail.${domain}`), [] as string[]);
  const hasCname = cname.data.some((r) => r.includes("hustlemail"));
  checks.push({
    type: "CNAME",
    host: `mail.${domain}`,
    expectedValue: records.webmail.value,
    actualValue: cname.error?.message ?? cname.data[0] ?? "Not set",
    status: cname.error ? "fail" : hasCname ? "pass" : "fail",
  });

  const allPassing = checks.filter((c) => c.status !== "pending").every((c) => c.status === "pass");

  return NextResponse.json({
    domain,
    records,
    checks,
    verified: allPassing,
    timestamp: new Date().toISOString(),
  });
}
