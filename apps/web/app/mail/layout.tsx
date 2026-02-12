import { Sidebar } from "@/components/mail/sidebar";
import { CommandMenu } from "@/components/mail/command-menu";

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
