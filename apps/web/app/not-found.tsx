import { SetupCard } from "@/components/workspace/setup-card";
export default function NotFound() {
  return (
    <SetupCard
      title="This page has moved on."
      description="There’s no page at this address. Your conversations are waiting in your inbox."
    >
      <a className="hm-primary" href="/mail/inbox">
        Return to your inbox
      </a>
    </SetupCard>
  );
}
