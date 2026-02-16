/**
 * Mail section layout with sidebar navigation.
 * Wraps all mail routes with the mail UI shell.
 * @module app/(private)/mail/layout
 */

import { Sidebar } from "@/components/mail/sidebar";
import { CommandMenu } from "@/components/mail/command-menu";

/**
 * Mail layout component with sidebar and command menu.
 * @param children - Mail page content.
 * @returns The mail layout shell.
 */
export default function MailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
      <CommandMenu />
    </div>
  );
}
