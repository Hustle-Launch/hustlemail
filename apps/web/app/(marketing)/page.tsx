"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import {
  Github,
  Zap,
  Code2,
  Shield,
  Bot,
  Infinity,
  DollarSign,
  GitBranch,
  Terminal,
  Check,
  ArrowRight,
  MessageSquare,
  Mail,
  Sparkles,
} from "lucide-react";
import { useRef, useEffect, useState } from "react";

// ============================================================================
// ANIMATED TERMINAL COMPONENT
// ============================================================================
function AnimatedTerminal() {
  const [currentStep, setCurrentStep] = useState(0);
  const [showCursor, setShowCursor] = useState(true);

  const steps = [
    { command: "npx codemail setup mycompany.com", delay: 2000 },
    { output: "✓ Created mail.config.ts", delay: 800 },
    { output: "✓ Domain verified: mycompany.com", delay: 600 },
    { output: "✓ DKIM keys generated", delay: 500 },
    { output: "✓ SPF record configured", delay: 400 },
    { command: "git push origin main", delay: 1500 },
    { output: "remote: ✓ CodeMail sync complete", delay: 600 },
    { output: "remote: ✓ 3 mailboxes configured", delay: 400 },
    { final: "🚀 Email is ready at team@mycompany.com", delay: 1000 },
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
      // Loop back
      const timer = setTimeout(() => {
        setCurrentStep(0);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [currentStep, steps]);

  return (
    <div className="w-full max-w-2xl">
      {/* Terminal window */}
      <div className="rounded-xl overflow-hidden border border-white/10 bg-black/60 backdrop-blur-xl shadow-2xl">
        {/* Title bar */}
        <div className="flex items-center gap-2 px-4 py-3 bg-white/5 border-b border-white/5">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          <span className="text-xs text-zinc-500 ml-2 font-mono">
            ~/projects/mycompany
          </span>
        </div>

        {/* Terminal content */}
        <div className="p-4 font-mono text-sm min-h-[280px]">
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
// CODE BLOCK COMPONENT
// ============================================================================
function CodeBlock({
  code,
  filename,
  className = "",
}: {
  code: string;
  filename?: string;
  className?: string;
}) {
  return (
    <div className={`rounded-xl overflow-hidden code-block ${className}`}>
      {filename && (
        <div className="flex items-center gap-2 px-4 py-2 bg-black/30 border-b border-white/5">
          <Code2 className="w-4 h-4 text-accent-400" />
          <span className="text-sm text-zinc-400 font-mono">{filename}</span>
        </div>
      )}
      <pre className="p-4 overflow-x-auto">
        <code className="text-sm font-mono">{code}</code>
      </pre>
    </div>
  );
}

// ============================================================================
// SYNTAX HIGHLIGHTED CONFIG
// ============================================================================
function MailConfigCode({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`rounded-xl overflow-hidden border border-accent-500/20 bg-black/40 backdrop-blur-sm ${compact ? "" : "glow"}`}
    >
      <div className="flex items-center justify-between px-4 py-2.5 bg-accent-950/30 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
          </div>
          <span className="text-xs text-zinc-400 font-mono ml-2">
            mail.config.ts
          </span>
        </div>
        <div className="flex items-center gap-1 text-xs text-zinc-500">
          <Sparkles className="w-3 h-3" />
          TypeScript
        </div>
      </div>
      <pre className={`${compact ? "p-4 text-xs" : "p-5 text-sm"} overflow-x-auto`}>
        <code className="font-mono leading-relaxed">
          <span className="text-purple-400">import</span>
          <span className="text-zinc-300">{" { "}</span>
          <span className="text-yellow-300">defineMailConfig</span>
          <span className="text-zinc-300">{" } "}</span>
          <span className="text-purple-400">from</span>
          <span className="text-green-400"> &apos;codemail&apos;</span>
          <span className="text-zinc-300">;</span>
          {"\n\n"}
          <span className="text-purple-400">export default</span>
          <span className="text-zinc-300"> defineMailConfig({"{"}</span>
          {"\n"}
          <span className="text-zinc-500">{"  // Your domain"}</span>
          {"\n"}
          <span className="text-blue-300">{"  domain"}</span>
          <span className="text-zinc-300">: </span>
          <span className="text-green-400">&apos;mycompany.com&apos;</span>
          <span className="text-zinc-300">,</span>
          {"\n\n"}
          <span className="text-zinc-500">{"  // Define your mailboxes"}</span>
          {"\n"}
          <span className="text-blue-300">{"  mailboxes"}</span>
          <span className="text-zinc-300">: {"{"}</span>
          {"\n"}
          <span className="text-blue-300">{"    team"}</span>
          <span className="text-zinc-300">: {"{ "}</span>
          <span className="text-blue-300">forwards</span>
          <span className="text-zinc-300">: [</span>
          <span className="text-green-400">&apos;alice@gmail.com&apos;</span>
          <span className="text-zinc-300">, </span>
          <span className="text-green-400">&apos;bob@gmail.com&apos;</span>
          <span className="text-zinc-300">] {"}"},</span>
          {"\n"}
          <span className="text-blue-300">{"    support"}</span>
          <span className="text-zinc-300">: {"{ "}</span>
          <span className="text-blue-300">webhook</span>
          <span className="text-zinc-300">: </span>
          <span className="text-green-400">
            &apos;https://api.mycompany.com/support&apos;
          </span>
          <span className="text-zinc-300">{" }"},</span>
          {"\n"}
          <span className="text-blue-300">{"    ceo"}</span>
          <span className="text-zinc-300">: {"{ "}</span>
          <span className="text-blue-300">imap</span>
          <span className="text-zinc-300">: </span>
          <span className="text-orange-400">true</span>
          <span className="text-zinc-300">{" }"},</span>
          {"\n"}
          <span className="text-zinc-300">{"  }"},</span>
          {"\n\n"}
          <span className="text-zinc-500">{"  // AI-powered spam filtering"}</span>
          {"\n"}
          <span className="text-blue-300">{"  spam"}</span>
          <span className="text-zinc-300">: {"{ "}</span>
          <span className="text-blue-300">ai</span>
          <span className="text-zinc-300">: </span>
          <span className="text-orange-400">true</span>
          <span className="text-zinc-300">, </span>
          <span className="text-blue-300">threshold</span>
          <span className="text-zinc-300">: </span>
          <span className="text-orange-400">0.8</span>
          <span className="text-zinc-300">{" }"},</span>
          {"\n"}
          <span className="text-zinc-300">{"}"});</span>
        </code>
      </pre>
    </div>
  );
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
      className="feature-card p-6 rounded-2xl border border-white/5 bg-white/[0.02]"
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
}: {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  highlighted?: boolean;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      className={`pricing-card relative p-8 rounded-2xl ${
        highlighted
          ? "border-2 border-accent-500/50 bg-accent-950/20 glow"
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
      <button
        className={`w-full py-3 px-4 rounded-xl font-medium transition-all btn-shine ${
          highlighted
            ? "bg-accent-500 text-white hover:bg-accent-600"
            : "bg-white/5 text-white hover:bg-white/10 border border-white/10"
        }`}
      >
        Get Started
      </button>
    </motion.div>
  );
}

// ============================================================================
// STEP CARD
// ============================================================================
function StepCard({
  number,
  title,
  description,
  icon: Icon,
  delay = 0,
}: {
  number: string;
  title: string;
  description: string;
  icon: React.ElementType;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      className="relative"
    >
      <div className="flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-500/20 to-purple-500/20 border border-accent-500/20 flex items-center justify-center mb-4 relative">
          <Icon className="w-7 h-7 text-accent-400" />
          <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-accent-500 text-white text-xs font-bold flex items-center justify-center">
            {number}
          </span>
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
        <p className="text-zinc-400 text-sm max-w-xs">{description}</p>
      </div>
    </motion.div>
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

  return (
    <main className="relative">
      {/* ================================================================== */}
      {/* NAVIGATION */}
      {/* ================================================================== */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-black/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-500 to-purple-500 flex items-center justify-center">
              <Mail className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold text-white">CodeMail</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a
              href="#features"
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              How It Works
            </a>
            <a
              href="#pricing"
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Pricing
            </a>
            <a
              href="https://github.com/codemail/codemail"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-zinc-400 hover:text-white transition-colors flex items-center gap-1"
            >
              <Github className="w-4 h-4" />
              GitHub
            </a>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/login"
              className="text-sm text-zinc-400 hover:text-white transition-colors hidden sm:block"
            >
              Sign In
            </a>
            <a
              href="/signup"
              className="px-4 py-2 bg-accent-500 hover:bg-accent-600 text-white text-sm font-medium rounded-lg transition-colors btn-shine"
            >
              Get Started
            </a>
          </div>
        </div>
      </nav>

      {/* ================================================================== */}
      {/* HERO SECTION */}
      {/* ================================================================== */}
      <section ref={heroRef} className="relative min-h-screen pt-32 pb-20">
        <motion.div
          style={{ opacity: heroOpacity, y: heroY }}
          className="max-w-7xl mx-auto px-6"
        >
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Text content */}
            <div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-500/10 border border-accent-500/20 text-accent-400 text-sm mb-6"
              >
                <Sparkles className="w-4 h-4" />
                Now in Public Beta
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-[1.1] mb-6"
              >
                Email infrastructure that{" "}
                <span className="gradient-text">lives in your repo</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-xl text-zinc-400 max-w-xl mb-8 leading-relaxed"
              >
                Version-controlled email configuration. Define mailboxes,
                forwarding rules, and webhooks in TypeScript. Push to deploy.
                No more wrestling with DNS panels.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="flex flex-col sm:flex-row gap-4"
              >
                <a
                  href="/signup"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-accent-500 hover:bg-accent-600 text-white font-medium rounded-xl transition-all btn-shine group"
                >
                  Get Started
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </a>
                <a
                  href="https://github.com/codemail/codemail"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 text-white font-medium rounded-xl border border-white/10 transition-all"
                >
                  <Github className="w-5 h-5" />
                  View on GitHub
                </a>
              </motion.div>

              {/* Quick code preview */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="mt-8 p-4 rounded-xl bg-black/40 border border-white/5 font-mono text-sm"
              >
                <span className="text-zinc-500">$</span>
                <span className="text-zinc-300"> npx codemail setup </span>
                <span className="text-accent-400">mycompany.com</span>
              </motion.div>
            </div>

            {/* Right: Code preview */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="relative"
            >
              <MailConfigCode />
              {/* Decorative elements */}
              <div className="absolute -z-10 -top-4 -right-4 w-full h-full rounded-xl border border-accent-500/10" />
              <div className="absolute -z-20 -top-8 -right-8 w-full h-full rounded-xl border border-accent-500/5" />
            </motion.div>
          </div>

          {/* Terminal animation */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="mt-20 flex justify-center"
          >
            <AnimatedTerminal />
          </motion.div>
        </motion.div>
      </section>

      {/* ================================================================== */}
      {/* HOW IT WORKS */}
      {/* ================================================================== */}
      <section id="how-it-works" className="py-32 relative">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              How It Works
            </h2>
            <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
              From zero to production email in under 5 minutes
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 md:gap-12 relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-8 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-accent-500/30 to-transparent" />

            <StepCard
              number="1"
              icon={Code2}
              title="Write mail.config.ts"
              description="Define your domains, mailboxes, forwarding rules, and webhooks in a type-safe config file."
              delay={0}
            />
            <StepCard
              number="2"
              icon={GitBranch}
              title="Push to GitHub"
              description="Commit your config and push. Our GitHub integration syncs your changes automatically."
              delay={0.1}
            />
            <StepCard
              number="3"
              icon={Zap}
              title="Email Works"
              description="That's it. DNS records are configured, mailboxes are created, and email starts flowing."
              delay={0.2}
            />
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* FEATURES */}
      {/* ================================================================== */}
      <section id="features" className="py-32 relative">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Built for Developers
            </h2>
            <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
              Email infrastructure that feels like modern developer tools
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={Zap}
              title="Real-time Sync"
              description="Powered by Convex. Your email state syncs in real-time across all your tools and dashboards."
              delay={0}
            />
            <FeatureCard
              icon={Code2}
              title="Config as Code"
              description="Version-controlled configuration in TypeScript. Review changes in PRs, rollback with git revert."
              delay={0.05}
            />
            <FeatureCard
              icon={Shield}
              title="Domain Isolation"
              description="Each domain is completely isolated. Separate DKIM keys, SPF records, and sending reputations."
              delay={0.1}
            />
            <FeatureCard
              icon={Bot}
              title="AI Spam Detection"
              description="Machine learning models trained on millions of emails. Catches spam that traditional filters miss."
              delay={0.15}
            />
            <FeatureCard
              icon={Infinity}
              title="Unlimited Mailboxes"
              description="Create as many mailboxes and aliases as you need. No per-seat pricing, no artificial limits."
              delay={0.2}
            />
            <FeatureCard
              icon={DollarSign}
              title="Fair Pricing"
              description="Pay per domain, not per user. BYO API keys for free tier. No hidden costs or surprise bills."
              delay={0.25}
            />
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* PRICING */}
      {/* ================================================================== */}
      <section id="pricing" className="py-32 relative">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Simple, Fair Pricing
            </h2>
            <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
              Pay for domains, not seats. Scale your team without scaling costs.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <PricingCard
              name="Free"
              price="$0"
              period="forever"
              description="Bring your own API keys"
              features={[
                "Unlimited mailboxes",
                "Unlimited forwarding",
                "GitHub sync",
                "Basic spam filtering",
                "Community support",
                "BYO Resend/Postmark keys",
              ]}
              delay={0}
            />
            <PricingCard
              name="Simple"
              price="$8"
              period="/domain/month"
              description="Managed email infrastructure"
              features={[
                "Everything in Free",
                "Managed sending (no BYO)",
                "AI spam detection",
                "Webhook integrations",
                "Email support",
                "99.9% uptime SLA",
              ]}
              highlighted
              delay={0.1}
            />
            <PricingCard
              name="Managed"
              price="$80"
              period="/domain/month"
              description="White-glove service"
              features={[
                "Everything in Simple",
                "Dedicated IP address",
                "Custom DKIM/SPF setup",
                "Migration assistance",
                "Priority support",
                "Direct Slack channel",
              ]}
              delay={0.2}
            />
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* CODE EXAMPLE */}
      {/* ================================================================== */}
      <section className="py-32 relative">
        <div className="max-w-4xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Your Entire Email Config
            </h2>
            <p className="text-xl text-zinc-400">
              One file. Complete control. Full type safety.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            <MailConfigCode />
          </motion.div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* CTA SECTION */}
      {/* ================================================================== */}
      <section className="py-32 relative">
        <div className="max-w-4xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative p-12 md:p-16 rounded-3xl overflow-hidden"
          >
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-accent-600/20 via-purple-600/10 to-accent-800/20" />
            <div className="absolute inset-0 border border-accent-500/20 rounded-3xl" />

            {/* Glow effect */}
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-accent-500/30 rounded-full blur-[100px]" />
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/20 rounded-full blur-[100px]" />

            <div className="relative text-center">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                Ready to own your email infrastructure?
              </h2>
              <p className="text-xl text-zinc-400 mb-8 max-w-2xl mx-auto">
                Join hundreds of developers who&apos;ve already made the switch.
                Setup takes under 5 minutes.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="/signup"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-black font-semibold rounded-xl hover:bg-zinc-100 transition-all btn-shine group"
                >
                  Start for Free
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </a>
                <a
                  href="https://github.com/codemail/codemail"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 text-white font-semibold rounded-xl hover:bg-white/20 transition-all border border-white/10"
                >
                  <Github className="w-5 h-5" />
                  Star on GitHub
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* FOOTER */}
      {/* ================================================================== */}
      <footer className="border-t border-white/5 py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-500 to-purple-500 flex items-center justify-center">
                  <Mail className="w-4 h-4 text-white" />
                </div>
                <span className="text-xl font-bold text-white">CodeMail</span>
              </div>
              <p className="text-sm text-zinc-500 mb-4">
                Email infrastructure that lives in your GitHub repo.
              </p>
              <div className="flex items-center gap-4">
                <a
                  href="https://github.com/codemail"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-500 hover:text-white transition-colors"
                >
                  <Github className="w-5 h-5" />
                </a>
                <a
                  href="https://discord.gg/codemail"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-500 hover:text-white transition-colors"
                >
                  <MessageSquare className="w-5 h-5" />
                </a>
              </div>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-3">
                <li>
                  <a
                    href="#features"
                    className="text-sm text-zinc-500 hover:text-white transition-colors"
                  >
                    Features
                  </a>
                </li>
                <li>
                  <a
                    href="#pricing"
                    className="text-sm text-zinc-500 hover:text-white transition-colors"
                  >
                    Pricing
                  </a>
                </li>
                <li>
                  <a
                    href="/docs"
                    className="text-sm text-zinc-500 hover:text-white transition-colors"
                  >
                    Documentation
                  </a>
                </li>
                <li>
                  <a
                    href="/changelog"
                    className="text-sm text-zinc-500 hover:text-white transition-colors"
                  >
                    Changelog
                  </a>
                </li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Company</h4>
              <ul className="space-y-3">
                <li>
                  <a
                    href="/about"
                    className="text-sm text-zinc-500 hover:text-white transition-colors"
                  >
                    About
                  </a>
                </li>
                <li>
                  <a
                    href="/blog"
                    className="text-sm text-zinc-500 hover:text-white transition-colors"
                  >
                    Blog
                  </a>
                </li>
                <li>
                  <a
                    href="/careers"
                    className="text-sm text-zinc-500 hover:text-white transition-colors"
                  >
                    Careers
                  </a>
                </li>
                <li>
                  <a
                    href="mailto:hello@codemail.dev"
                    className="text-sm text-zinc-500 hover:text-white transition-colors"
                  >
                    Contact
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-3">
                <li>
                  <a
                    href="/privacy"
                    className="text-sm text-zinc-500 hover:text-white transition-colors"
                  >
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a
                    href="/terms"
                    className="text-sm text-zinc-500 hover:text-white transition-colors"
                  >
                    Terms of Service
                  </a>
                </li>
                <li>
                  <a
                    href="/dpa"
                    className="text-sm text-zinc-500 hover:text-white transition-colors"
                  >
                    DPA
                  </a>
                </li>
                <li>
                  <a
                    href="/security"
                    className="text-sm text-zinc-500 hover:text-white transition-colors"
                  >
                    Security
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-zinc-500">
              © {new Date().getFullYear()} CodeMail. All rights reserved.
            </p>
            <p className="text-sm text-zinc-600">
              Built with ❤️ for developers who deserve better email
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
