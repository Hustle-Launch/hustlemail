"use client";

import { useRouter } from "next/navigation";
import {
  Inbox,
  Send,
  Star,
  Archive,
  Trash2,
  PenSquare,
  Search,
  Settings,
  Moon,
  Sun,
  LogOut,
} from "lucide-react";
import { useTheme } from "next-themes";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { useCommandMenu } from "@/hooks/use-command-menu";

export function CommandMenu() {
  const router = useRouter();
  const { open, setOpen } = useCommandMenu();
  const { theme, setTheme } = useTheme();
  
  // Mock signOut - in production, wire up Clerk
  const signOut = () => {
    window.location.href = "/";
  };

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        
        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => runCommand(() => router.push("/mail/compose"))}>
            <PenSquare className="mr-2 h-4 w-4" />
            Compose new email
            <CommandShortcut>C</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/mail/search"))}>
            <Search className="mr-2 h-4 w-4" />
            Search emails
            <CommandShortcut>/</CommandShortcut>
          </CommandItem>
        </CommandGroup>
        
        <CommandSeparator />
        
        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => runCommand(() => router.push("/mail/inbox"))}>
            <Inbox className="mr-2 h-4 w-4" />
            Go to Inbox
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/mail/sent"))}>
            <Send className="mr-2 h-4 w-4" />
            Go to Sent
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/mail/starred"))}>
            <Star className="mr-2 h-4 w-4" />
            Go to Starred
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/mail/archive"))}>
            <Archive className="mr-2 h-4 w-4" />
            Go to Archive
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/mail/trash"))}>
            <Trash2 className="mr-2 h-4 w-4" />
            Go to Trash
          </CommandItem>
        </CommandGroup>
        
        <CommandSeparator />
        
        <CommandGroup heading="Settings">
          <CommandItem onSelect={() => runCommand(() => router.push("/settings"))}>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => setTheme(theme === "dark" ? "light" : "dark"))}
          >
            <Sun className="mr-2 h-4 w-4 dark:hidden" />
            <Moon className="mr-2 h-4 w-4 hidden dark:block" />
            Toggle theme
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => signOut())}
            className="text-destructive"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
