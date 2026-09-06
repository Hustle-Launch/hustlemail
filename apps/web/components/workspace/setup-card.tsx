import { Mail } from "lucide-react";
import type { ReactNode } from "react";

export function SetupCard({
  title,
  description,
  children,
  loading,
  error,
}: {
  title: string;
  description: string;
  children?: ReactNode;
  loading?: boolean;
  error?: string | null;
}) {
  return (
    <main className="hm-setup">
      <section className="hm-setup-card">
        <div className="hm-brand">
          <span className="hm-mark">
            <Mail size={17} />
          </span>
          <strong>
            Hustlemail<span>.</span>
          </strong>
        </div>
        <span className="hm-eyebrow">MAKE SPACE FOR WHAT MATTERS</span>
        <h1>{title}</h1>
        <p>{description}</p>
        {loading && (
          <span
            className="hm-loading"
            style={{ display: "block", marginTop: 25 }}
          />
        )}
        {error && (
          <p className="hm-setup-error" role="alert">
            {error}
          </p>
        )}
        {children && <div className="hm-setup-links">{children}</div>}
      </section>
    </main>
  );
}
