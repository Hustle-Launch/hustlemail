/**
 * DNS verification API route.
 * Generates required DNS records and verifies current configuration.
 * @module app/api/dns/[domain]/route
 */

import { NextRequest, NextResponse } from "next/server";
import dns from "dns/promises";

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
      purpose: "Routes incoming email to CodeMail servers",
    },
    spf: {
      type: "TXT",
      host: "@",
      value: "v=spf1 include:_spf.resend.com ~all",
      purpose: "Authorizes CodeMail to send email on your behalf",
    },
    dkim: {
      type: "TXT",
      host: "codemail._domainkey",
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
      value: "codemail.vercel.app",
      purpose: "Enables web mail access at mail.${domain}",
    },
  };

  // Verify current DNS configuration
  const checks: DnsRecordCheck[] = [];

  try {
    // Check MX
    const mxRecords = await dns.resolveMx(domain).catch(() => []);
    const hasMx = mxRecords.some((r) => r.exchange.includes("mail." + domain));
    checks.push({
      type: "MX",
      host: domain,
      expectedValue: records.mx.value,
      actualValue: mxRecords.map((r) => `${r.priority} ${r.exchange}`).join(", ") || "Not set",
      status: hasMx ? "pass" : "fail",
    });

    // Check SPF
    const txtRecords = await dns.resolveTxt(domain).catch(() => []);
    const spfRecord = txtRecords.flat().find((r) => r.startsWith("v=spf1"));
    const hasSpf = spfRecord?.includes("resend.com");
    checks.push({
      type: "TXT (SPF)",
      host: domain,
      expectedValue: records.spf.value,
      actualValue: spfRecord || "Not set",
      status: hasSpf ? "pass" : "fail",
    });

    // Check DKIM
    const dkimRecords = await dns.resolveTxt(`codemail._domainkey.${domain}`).catch(() => []);
    const dkimRecord = dkimRecords.flat().find((r) => r.startsWith("v=DKIM1"));
    checks.push({
      type: "TXT (DKIM)",
      host: `codemail._domainkey.${domain}`,
      expectedValue: records.dkim.value,
      actualValue: dkimRecord || "Not set",
      status: dkimRecord ? "pass" : "fail",
    });

    // Check DMARC
    const dmarcRecords = await dns.resolveTxt(`_dmarc.${domain}`).catch(() => []);
    const dmarcRecord = dmarcRecords.flat().find((r) => r.startsWith("v=DMARC1"));
    checks.push({
      type: "TXT (DMARC)",
      host: `_dmarc.${domain}`,
      expectedValue: records.dmarc.value,
      actualValue: dmarcRecord || "Not set",
      status: dmarcRecord ? "pass" : "pending", // DMARC is optional
    });

    // Check CNAME for webmail
    const cnameRecords = await dns.resolveCname(`mail.${domain}`).catch(() => []);
    const hasCname = cnameRecords.some((r) => r.includes("codemail"));
    checks.push({
      type: "CNAME",
      host: `mail.${domain}`,
      expectedValue: records.webmail.value,
      actualValue: cnameRecords[0] || "Not set",
      status: hasCname ? "pass" : "fail",
    });
  } catch (error) {
    console.error("DNS lookup error:", error);
  }

  const allPassing = checks.filter((c) => c.status !== "pending").every((c) => c.status === "pass");

  return NextResponse.json({
    domain,
    records,
    checks,
    verified: allPassing,
    timestamp: new Date().toISOString(),
  });
}
