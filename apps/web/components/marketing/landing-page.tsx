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
  CreditCard,
  Users,
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
    { output: "✓ Domain verified: mycompany.com", delay: 800 },
    { output: "✓ DNS records configured", delay: 600 },
    { output: "✓ DKIM keys generated", delay: 500 },
    { output: "✓ Mailboxes created: team, support, hello", delay: 600 },
    { final: "🚀 team@mycompany.com is ready!", delay: 1000 },
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
          <span className="text-xs text-zinc-500 ml-2 font-mono">terminal</span>
        </div>
        <div className="p-4 font-mono text-sm min-h-[200px]">
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
        Get Started
      </a>
    </motion.div>
  );
}

// ============================================================================
// COMPARISON ROW
// ============================================================================
function ComparisonRow({
  feature,
  google,
  codemail,
}: {
  feature: string;
  google: string;
  codemail: string;
}) {
  return (
    <div className="grid grid-cols-3 gap-4 py-4 border-b border-white/5 text-sm">
      <div className="text-zinc-300">{feature}</div>
      <div className="text-zinc-500 text-center">{google}</div>
      <div className="text-accent-400 text-center font-medium">{codemail}</div>
    </div>
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
            <a href="#why" className="text-sm text-zinc-400 hover:text-white transition-colors">
              Why CodeMail
            </a>
            <a href="#pricing" className="text-sm text-zinc-400 hover:text-white transition-colors">
              Pricing
            </a>
            <a href="#compare" className="text-sm text-zinc-400 hover:text-white transition-colors">
              vs Google
            </a>
          </div>
          <div className="flex items-center gap-3">
            <a href="/sign-in" className="text-sm text-zinc-400 hover:text-white transition-colors hidden sm:block">
              Sign In
            </a>
            <a href="/sign-up" className="px-4 py-2 bg-accent-500 hover:bg-accent-600 text-white text-sm font-medium rounded-lg transition-colors">
              Get Started Free
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
              Company email for founders, not enterprises
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-[1.1] mb-6"
            >
              Your startup deserves{" "}
              <span className="bg-gradient-to-r from-accent-400 to-purple-400 bg-clip-text text-transparent">
                real email
              </span>{" "}
              from day 1
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-xl text-zinc-400 max-w-2xl mx-auto mb-4 leading-relaxed"
            >
              Real companies have company email. You shouldn&apos;t have to pay Google 
              $600/year for 5 mailboxes while you&apos;re still figuring out if your idea works.
            </motion.p>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="text-lg text-zinc-500 max-w-xl mx-auto mb-8"
            >
              Get team@yourcompany.com working in 5 minutes. Unlimited mailboxes. $8/month.
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
                Start Free — No Credit Card
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </a>
            </motion.div>

            {/* Social proof */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="mt-12 flex items-center justify-center gap-8 text-sm text-zinc-500"
            >
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                <span>For MVPs & startups</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                <span>Setup in 5 minutes</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>Unlimited mailboxes</span>
              </div>
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

      {/* WHY CODEMAIL */}
      <section id="why" className="py-32 relative">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Built for founders, not IT departments
            </h2>
            <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
              You have an idea. You want it to feel real. Real companies have company email.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={Rocket}
              title="Launch in 5 Minutes"
              description="One command to set up your domain. We handle DNS, DKIM, SPF — all the stuff that usually takes a weekend."
              delay={0}
            />
            <FeatureCard
              icon={Users}
              title="Unlimited Mailboxes"
              description="team@, support@, hello@, founders@, investors@ — create as many as you need. No per-seat pricing."
              delay={0.05}
            />
            <FeatureCard
              icon={DollarSign}
              title="$8/month. Period."
              description="One domain, unlimited mailboxes, unlimited users. Not $6/user/month like Google Workspace."
              delay={0.1}
            />
            <FeatureCard
              icon={Shield}
              title="Real Email Infrastructure"
              description="DKIM signing, SPF records, spam filtering — your emails land in inboxes, not spam folders."
              delay={0.15}
            />
            <FeatureCard
              icon={Bot}
              title="AI Spam Filtering"
              description="Modern ML-based spam detection that actually understands context, not 20-year-old Bayesian filters."
              delay={0.2}
            />
            <FeatureCard
              icon={Terminal}
              title="Developer Friendly"
              description="Webhooks for new emails, API access, config-as-code. Integrate with your app, not around it."
              delay={0.25}
            />
          </div>
        </div>
      </section>

      {/* COMPARISON */}
      <section id="compare" className="py-32 relative">
        <div className="max-w-4xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Stop paying enterprise prices
            </h2>
            <p className="text-xl text-zinc-400">
              Google Workspace is built for Fortune 500s. You&apos;re building an MVP.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-white/10 bg-white/[0.02] p-8"
          >
            <div className="grid grid-cols-3 gap-4 pb-4 border-b border-white/10 text-sm font-medium">
              <div className="text-zinc-400">Feature</div>
              <div className="text-zinc-400 text-center">Google Workspace</div>
              <div className="text-accent-400 text-center">CodeMail</div>
            </div>
            <ComparisonRow feature="5 team mailboxes" google="$360/year" codemail="$96/year" />
            <ComparisonRow feature="10 team mailboxes" google="$720/year" codemail="$96/year" />
            <ComparisonRow feature="Setup time" google="Hours + DNS headaches" codemail="5 minutes" />
            <ComparisonRow feature="Pricing model" google="Per user/month" codemail="Per domain (unlimited users)" />
            <ComparisonRow feature="Spam filtering" google="✓" codemail="✓ AI-powered" />
            <ComparisonRow feature="Custom domain" google="✓" codemail="✓" />
            <ComparisonRow feature="API & Webhooks" google="Complex setup" codemail="Built in" />
            <ComparisonRow feature="Target audience" google="Enterprises" codemail="Founders & startups" />
          </motion.div>
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
              Simple pricing for real startups
            </h2>
            <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
              Pay per domain, not per user. Your team grows? Your email bill doesn&apos;t.
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
                "Basic spam filtering",
                "Community support",
                "You provide Resend API key",
              ]}
              delay={0}
            />
            <PricingCard
              name="Startup"
              price="$8"
              period="/domain/month"
              description="Everything you need to look legit"
              features={[
                "Unlimited mailboxes",
                "Unlimited team members",
                "AI spam detection",
                "Web mail interface",
                "Webhook integrations",
                "Email support",
              ]}
              highlighted
              delay={0.1}
            />
            <PricingCard
              name="Growth"
              price="$80"
              period="/domain/month"
              description="For teams that need more"
              features={[
                "Everything in Startup",
                "Dedicated IP address",
                "Priority deliverability",
                "Migration assistance",
                "Priority support",
                "Slack channel access",
              ]}
              delay={0.2}
            />
          </div>
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
                Your idea deserves a real email address
              </h2>
              <p className="text-xl text-zinc-400 mb-8 max-w-2xl mx-auto">
                Stop sending from gmail. Start sending from yourcompany.com. 
                Setup takes 5 minutes. No credit card required.
              </p>
              <a
                href="/sign-up"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-black font-semibold rounded-xl hover:bg-zinc-100 transition-all group"
              >
                Get Started Free
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
              © {new Date().getFullYear()} CodeMail. Email infrastructure for founders.
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
