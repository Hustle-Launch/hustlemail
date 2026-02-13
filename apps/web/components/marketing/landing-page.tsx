"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import {
  Github,
  Zap,
  Shield,
  Bot,
  DollarSign,
  Terminal,
  Check,
  ArrowRight,
  Mail,
  Sparkles,
  Building2,
  Rocket,
  Users,
  Server,
  Key,
  GitBranch,
  Code2,
} from "lucide-react";
import { useRef, useEffect, useState } from "react";

// ============================================================================
// ANIMATED TERMINAL - Day 1 Founder Workflow
// ============================================================================
function AnimatedTerminal() {
  const [currentStep, setCurrentStep] = useState(0);
  const [showCursor, setShowCursor] = useState(true);

  const steps = [
    { command: "npx create-next-app myapp", delay: 1500 },
    { output: "✓ Created myapp", delay: 600 },
    { command: "cd myapp", delay: 800 },
    { command: "npx mail setup mycompany.com", delay: 2000 },
    { output: "✓ mail.config.ts created", delay: 500 },
    { output: "✓ DNS records configured", delay: 400 },
    { output: "✓ DKIM keys generated", delay: 400 },
    { command: "git push", delay: 1200 },
    { output: "✓ Deployed to Convex", delay: 500 },
    { final: "🚀 founder@mycompany.com works. Cost: $0", delay: 1500 },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 530);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (currentStep < steps.length - 1) {
      const timer = setTimeout(() => {
        setCurrentStep((prev) => prev + 1);
      }, steps[currentStep].delay);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => {
        setCurrentStep(0);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [currentStep, steps]);

  return (
    <div className="w-full max-w-2xl">
      <div className="rounded-xl overflow-hidden border border-white/10 bg-black/60 backdrop-blur-xl shadow-2xl">
        <div className="flex items-center gap-2 px-4 py-3 bg-white/5 border-b border-white/5">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          <span className="text-xs text-zinc-500 ml-2 font-mono">~/projects</span>
        </div>
        <div className="p-4 font-mono text-sm min-h-[260px]">
          {steps.slice(0, currentStep + 1).map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="mb-1"
            >
              {step.command && (
                <div className="flex items-center gap-2">
                  <span className="text-green-400">❯</span>
                  <span className="text-zinc-100">{step.command}</span>
                  {index === currentStep && showCursor && (
                    <span className="w-2 h-4 bg-white/80 animate-pulse" />
                  )}
                </div>
              )}
              {step.output && (
                <div className="text-zinc-400 pl-4">{step.output}</div>
              )}
              {step.final && (
                <div className="text-accent-400 font-semibold mt-2 flex items-center gap-2">
                  {step.final}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// CODE BLOCKS - Day 1 / Seed / Scale
// ============================================================================
function CodeBlockDay1() {
  return (
    <div className="space-y-4">
      {/* Terminal commands */}
      <div className="rounded-xl overflow-hidden border border-white/10 bg-black/60">
        <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border-b border-white/5">
          <span className="text-xs text-zinc-500 font-mono">terminal</span>
        </div>
        <pre className="p-4 text-sm font-mono text-zinc-300 overflow-x-auto">
{`# Create new project
npx create-next-app myapp
cd myapp

# Add mail
npx mail setup mycompany.com`}</pre>
      </div>
      
      {/* mail.config.ts */}
      <div className="rounded-xl overflow-hidden border border-accent-500/20 bg-black/40">
        <div className="flex items-center gap-2 px-4 py-2 bg-accent-950/30 border-b border-white/5">
          <span className="text-xs text-zinc-400 font-mono">mail.config.ts appears:</span>
        </div>
        <pre className="p-4 text-sm font-mono text-zinc-300 overflow-x-auto">
{`export const domain = "mycompany.com";
export const mailboxes = ["support", "founders", "noreply"];
export const routes = {
  support: ["founder1", "founder2"],
  founders: ["founder1", "founder2"],
  noreply: ["bounce"],
};`}</pre>
      </div>

      {/* convex/auth.ts */}
      <div className="rounded-xl overflow-hidden border border-white/10 bg-black/40">
        <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border-b border-white/5">
          <span className="text-xs text-zinc-500 font-mono">convex/auth.ts</span>
        </div>
        <pre className="p-4 text-sm font-mono text-zinc-300 overflow-x-auto">
{`export const mockUsers = [
  { id: "1", name: "founder1" },
  { id: "2", name: "founder2" },
];`}</pre>
      </div>

      <p className="text-sm text-zinc-500 text-center">
        Deploy with <code className="text-accent-400">git push</code> — founder1@mycompany.com works. Cost: $0.
      </p>
    </div>
  );
}

function CodeBlockSeed() {
  return (
    <div className="space-y-4">
      <p className="text-zinc-400 text-center text-sm mb-4">When they close their seed round:</p>
      
      {/* convex/auth.ts with WorkOS */}
      <div className="rounded-xl overflow-hidden border border-accent-500/20 bg-black/40">
        <div className="flex items-center gap-2 px-4 py-2 bg-accent-950/30 border-b border-white/5">
          <span className="text-xs text-zinc-400 font-mono">convex/auth.ts</span>
        </div>
        <pre className="p-4 text-sm font-mono text-zinc-300 overflow-x-auto">
{`import { ConvexAuth } from "@convex-dev/auth";
import WorkOS from "@convex-dev/auth/providers/WorkOS";

export const { auth, signIn, signOut } = ConvexAuth({
  providers: [WorkOS],
});

// mail.config.ts doesn't change. SMTP doesn't change.
// They just add real SSO for the team. Done.`}</pre>
      </div>
    </div>
  );
}

function CodeBlockScale() {
  return (
    <div className="space-y-4">
      <p className="text-zinc-400 text-center text-sm mb-4">When they hire 50 people:</p>
      
      {/* Expanded mail.config.ts */}
      <div className="rounded-xl overflow-hidden border border-accent-500/20 bg-black/40">
        <div className="flex items-center gap-2 px-4 py-2 bg-accent-950/30 border-b border-white/5">
          <span className="text-xs text-zinc-400 font-mono">mail.config.ts</span>
        </div>
        <pre className="p-4 text-sm font-mono text-zinc-300 overflow-x-auto">
{`export const mailboxes = [
  "support", "engineering", "sales", "founder", "hr",
  "noreply", "catch-all"
];
export const routes = {
  support: ["support_lead", "support_team_1", "support_team_2"],
  engineering: ["cto", "eng_lead", "eng_team"],
  sales: ["head_of_sales", "ae1", "ae2"],
  catch_all: ["founder", "cto", "head_of_sales"],
};

// With WorkOS/Okta connected, new hires auto-appear
// mail.config.ts route definitions are source of truth
// Add new team? Update routes, push, done.`}</pre>
      </div>
    </div>
  );
}

function MailConfigBlock({ stage }: { stage: "mvp" | "seed" | "scale" }) {
  if (stage === "mvp") return <CodeBlockDay1 />;
  if (stage === "seed") return <CodeBlockSeed />;
  return <CodeBlockScale />;
}

// ============================================================================
// FEATURE CARD
// ============================================================================
function FeatureCard({
  icon: Icon,
  title,
  description,
  delay = 0,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      className="p-6 rounded-2xl border border-white/5 bg-white/[0.02]"
    >
      <div className="w-12 h-12 rounded-xl bg-accent-500/10 flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-accent-400" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-zinc-400 text-sm leading-relaxed">{description}</p>
    </motion.div>
  );
}

// ============================================================================
// PRICING CARD
// ============================================================================
function PricingCard({
  name,
  price,
  period,
  description,
  features,
  highlighted = false,
  delay = 0,
  cta = "Get Started",
}: {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  highlighted?: boolean;
  delay?: number;
  cta?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      className={`relative p-8 rounded-2xl ${
        highlighted
          ? "border-2 border-accent-500/50 bg-accent-950/20"
          : "border border-white/10 bg-white/[0.02]"
      }`}
    >
      {highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-accent-500 rounded-full text-xs font-medium text-white">
          Most Popular
        </div>
      )}
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-white mb-1">{name}</h3>
        <p className="text-zinc-500 text-sm">{description}</p>
      </div>
      <div className="mb-6">
        <span className="text-4xl font-bold text-white">{price}</span>
        <span className="text-zinc-500 ml-2">{period}</span>
      </div>
      <ul className="space-y-3 mb-8">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-3 text-sm">
            <Check className="w-5 h-5 text-accent-400 shrink-0 mt-0.5" />
            <span className="text-zinc-300">{feature}</span>
          </li>
        ))}
      </ul>
      <a
        href="/sign-up"
        className={`block w-full py-3 px-4 rounded-xl font-medium transition-all text-center ${
          highlighted
            ? "bg-accent-500 text-white hover:bg-accent-600"
            : "bg-white/5 text-white hover:bg-white/10 border border-white/10"
        }`}
      >
        {cta}
      </a>
    </motion.div>
  );
}

// ============================================================================
// GROWTH STAGE TAB
// ============================================================================
function GrowthStage({
  stage,
  active,
  onClick,
  label,
}: {
  stage: string;
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
        active
          ? "bg-accent-500 text-white"
          : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================
export default function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 100]);
  
  const [growthStage, setGrowthStage] = useState<"mvp" | "seed" | "scale">("mvp");

  return (
    <main className="relative">
      {/* NAVIGATION */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-black/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-500 to-purple-500 flex items-center justify-center">
              <Mail className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold text-white">CodeMail</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#how-it-works" className="text-sm text-zinc-400 hover:text-white transition-colors">
              How It Works
            </a>
            <a href="#grows-with-you" className="text-sm text-zinc-400 hover:text-white transition-colors">
              Growth
            </a>
            <a href="#pricing" className="text-sm text-zinc-400 hover:text-white transition-colors">
              Pricing
            </a>
          </div>
          <div className="flex items-center gap-3">
            <a href="/sign-in" className="text-sm text-zinc-400 hover:text-white transition-colors hidden sm:block">
              Sign In
            </a>
            <a href="/sign-up" className="px-4 py-2 bg-accent-500 hover:bg-accent-600 text-white text-sm font-medium rounded-lg transition-colors">
              Get Started
            </a>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section ref={heroRef} className="relative min-h-screen pt-32 pb-20">
        <motion.div style={{ opacity: heroOpacity, y: heroY }} className="max-w-7xl mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-500/10 border border-accent-500/20 text-accent-400 text-sm mb-6"
            >
              <Sparkles className="w-4 h-4" />
              Infrastructure for founders
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-[1.1] mb-6"
            >
              Add email to your app like you add a database.{" "}
              <span className="bg-gradient-to-r from-accent-400 to-purple-400 bg-clip-text text-transparent">
                Code first, config second, done.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-xl text-zinc-400 max-w-2xl mx-auto mb-4 leading-relaxed"
            >
              Email shouldn&apos;t be a business problem. It should be a configuration problem.
              Your <code className="text-accent-400 bg-accent-500/10 px-1.5 py-0.5 rounded">mail.config.ts</code> lives 
              in your repo, deploys with your app, grows with your company.
            </motion.p>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="text-lg text-zinc-500 max-w-xl mx-auto mb-8"
            >
              From MVP to IPO, your mail.config.ts grows with you.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <a
                href="/sign-up"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-accent-500 hover:bg-accent-600 text-white font-semibold rounded-xl transition-all group"
              >
                Start Free Forever
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </a>
              <a
                href="https://github.com/michaelmonetized/codemail"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl border border-white/10 transition-all"
              >
                <Github className="w-5 h-5" />
                View Source
              </a>
            </motion.div>
          </div>

          {/* Terminal demo */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="mt-16 flex justify-center"
          >
            <AnimatedTerminal />
          </motion.div>
        </motion.div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-32 relative">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Day 1 founder workflow
            </h2>
            <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
              You have an idea. You want it to feel real. Real companies have company email.
              You shouldn&apos;t pay $600/year for 5 mailboxes while figuring out if it works.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={Terminal}
              title="One command setup"
              description="npx mail setup mycompany.com — creates mail.config.ts, configures DNS, generates DKIM keys. You're done."
              delay={0}
            />
            <FeatureCard
              icon={GitBranch}
              title="Lives in your repo"
              description="mail.config.ts is version controlled, reviewed in PRs, deploys with git push. No more wrestling with dashboards."
              delay={0.05}
            />
            <FeatureCard
              icon={DollarSign}
              title="Free on Convex free tier"
              description="Your email infrastructure runs on Convex. Their free tier covers thousands of emails. Cost: $0."
              delay={0.1}
            />
            <FeatureCard
              icon={Users}
              title="Unlimited mailboxes"
              description="support@, founders@, investors@, noreply@ — create as many as you need. No per-seat pricing."
              delay={0.15}
            />
            <FeatureCard
              icon={Shield}
              title="Real infrastructure"
              description="DKIM signing, SPF records, spam filtering. Your emails land in inboxes, not spam folders."
              delay={0.2}
            />
            <FeatureCard
              icon={Zap}
              title="Auth is orthogonal"
              description="Start with mock users, swap in WorkOS/Clerk/Okta when you close your seed round. Config doesn't change."
              delay={0.25}
            />
          </div>
        </div>
      </section>

      {/* GROWS WITH YOU */}
      <section id="grows-with-you" className="py-32 relative">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              From MVP to IPO
            </h2>
            <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
              Your mail.config.ts grows with you. Same file, same patterns, from 2 founders to 500 employees.
            </p>
          </motion.div>

          {/* Stage selector */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex justify-center gap-2 mb-8"
          >
            <GrowthStage
              stage="mvp"
              active={growthStage === "mvp"}
              onClick={() => setGrowthStage("mvp")}
              label="Day 1 — MVP"
            />
            <GrowthStage
              stage="seed"
              active={growthStage === "seed"}
              onClick={() => setGrowthStage("seed")}
              label="Seed Round"
            />
            <GrowthStage
              stage="scale"
              active={growthStage === "scale"}
              onClick={() => setGrowthStage("scale")}
              label="50+ Employees"
            />
          </motion.div>

          {/* Config display */}
          <motion.div
            key={growthStage}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <MailConfigBlock stage={growthStage} />
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center text-zinc-500 mt-8"
          >
            Update routes, push, done. With Okta/WorkOS connected, new hires auto-appear in your users table.
          </motion.p>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-32 relative">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Simple, honest pricing
            </h2>
            <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
              Pay per domain, not per user. Every tier gets unlimited mailboxes, routes, and rules.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {/* Free Forever */}
            <PricingCard
              name="Free Forever"
              price="$0"
              period="/mo — forever"
              description="Bring your own API keys"
              features={[
                "Unlimited mailboxes",
                "Unlimited domains",
                "Unlimited routes & rules",
                "BYO Resend (outbound)",
                "BYO OpenRouter (spam AI)",
                "BYO Convex (backend)",
                "BYO Uploadthing (files)",
                "Community support",
              ]}
              cta="Start Free"
              delay={0}
            />

            {/* Simple */}
            <PricingCard
              name="Simple"
              price="$8"
              period="/domain/month"
              description="Managed infrastructure"
              features={[
                "Unlimited mailboxes",
                "Unlimited routes & rules",
                "Managed Convex instance",
                "Managed SMTP/IMAP",
                "Managed spam AI",
                "Managed Resend (outbound)",
                "Reputation warming",
                "Email support",
              ]}
              highlighted
              cta="Get Started"
              delay={0.1}
            />

            {/* Managed */}
            <PricingCard
              name="Managed"
              price="$80"
              period="/domain/month"
              description="White glove service"
              features={[
                "Everything in Simple",
                "Dedicated SMTP/IMAP",
                "Dedicated IP warming",
                "1TB file bandwidth/mo",
                "Migration assistance",
                "DNS config assistance",
                "mail.config.ts review",
                "Priority Slack support",
              ]}
              cta="Contact Us"
              delay={0.2}
            />

            {/* Self-Hosted */}
            <PricingCard
              name="Self-Hosted"
              price="Free"
              period="OSS"
              description="Run it yourself"
              features={[
                "Full source code",
                "SMTP ingress server",
                "IMAP proxy server",
                "Web mail client",
                "Spam eval pipeline",
                "CLI tooling",
                "Deploy anywhere",
                "Community support",
              ]}
              cta="View on GitHub"
              delay={0.3}
            />
          </div>

          {/* BYO Keys Explainer */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-16 max-w-3xl mx-auto"
          >
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8">
              <div className="flex items-center gap-3 mb-4">
                <Key className="w-6 h-6 text-accent-400" />
                <h3 className="text-lg font-semibold text-white">What&apos;s &quot;Bring Your Own Keys&quot;?</h3>
              </div>
              <p className="text-zinc-400 mb-6">
                The Free Forever tier lets you own every dependency. You bring API keys from these providers 
                (all have generous free tiers) and pay them directly. We charge nothing.
              </p>
              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                    <Mail className="w-4 h-4 text-zinc-400" />
                  </div>
                  <div>
                    <div className="text-white font-medium">Resend</div>
                    <div className="text-zinc-500">Outbound email sending</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-zinc-400" />
                  </div>
                  <div>
                    <div className="text-white font-medium">OpenRouter</div>
                    <div className="text-zinc-500">AI spam filtering</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                    <Server className="w-4 h-4 text-zinc-400" />
                  </div>
                  <div>
                    <div className="text-white font-medium">Convex</div>
                    <div className="text-zinc-500">Real-time backend</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                    <Shield className="w-4 h-4 text-zinc-400" />
                  </div>
                  <div>
                    <div className="text-white font-medium">Uploadthing</div>
                    <div className="text-zinc-500">Large file storage</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 relative">
        <div className="max-w-4xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative p-12 md:p-16 rounded-3xl overflow-hidden text-center"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-accent-600/20 via-purple-600/10 to-accent-800/20" />
            <div className="absolute inset-0 border border-accent-500/20 rounded-3xl" />
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-accent-500/30 rounded-full blur-[100px]" />
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/20 rounded-full blur-[100px]" />

            <div className="relative">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                Email shouldn&apos;t be a business problem
              </h2>
              <p className="text-xl text-zinc-400 mb-8 max-w-2xl mx-auto">
                It should be a configuration problem. Add email to your app like you add a database.
                Code first, config second, done.
              </p>
              <a
                href="/sign-up"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-black font-semibold rounded-xl hover:bg-zinc-100 transition-all group"
              >
                Start Free Forever
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/5 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-500 to-purple-500 flex items-center justify-center">
                <Mail className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl font-bold text-white">CodeMail</span>
            </div>
            <p className="text-sm text-zinc-500">
              © {new Date().getFullYear()} CodeMail. Infrastructure for founders.
            </p>
            <div className="flex items-center gap-6">
              <a href="/privacy" className="text-sm text-zinc-500 hover:text-white transition-colors">
                Privacy
              </a>
              <a href="/terms" className="text-sm text-zinc-500 hover:text-white transition-colors">
                Terms
              </a>
              <a
                href="https://github.com/michaelmonetized/codemail"
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-500 hover:text-white transition-colors"
              >
                <Github className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
