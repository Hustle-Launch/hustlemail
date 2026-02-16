/**
 * Mail sidebar component with navigation, labels, and user menu.
 * Provides primary navigation for the mail interface.
 * @module components/mail/sidebar
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Inbox,
  Send,
  Star,
  Archive,
  Trash2,
  Tag,
  Settings,
  PenSquare,
  Search,
  Moon,
  Sun,
  LogOut,
  ChevronDown,
  User,
} from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

/** Mock user data for demo mode when Clerk isn't configured. */
const mockUser = {
  fullName: "Demo User",
  firstName: "Demo",
  lastName: "User",
  imageUrl: undefined as string | undefined,
  primaryEmailAddress: { emailAddress: "demo@example.com" },
};
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/** Primary navigation items with icons and optional badge counts. */
const navigation = [
  { name: "Inbox", href: "/mail/inbox", icon: Inbox, badge: 12 },
  { name: "Sent", href: "/mail/sent", icon: Send },
  { name: "Starred", href: "/mail/starred", icon: Star },
  { name: "Archive", href: "/mail/archive", icon: Archive },
  { name: "Trash", href: "/mail/trash", icon: Trash2 },
];

/** User-defined labels with associated colors. */
const labels = [
  { name: "Work", color: "bg-blue-500" },
  { name: "Personal", color: "bg-green-500" },
  { name: "Important", color: "bg-red-500" },
  { name: "Updates", color: "bg-yellow-500" },
];

/**
 * Sidebar component for the mail interface.
 * Includes branding, compose/search actions, navigation, labels, and user profile.
 * @returns The sidebar element.
 */
export function Sidebar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  
  // Use mock user for demo - in production, wire up Clerk
  const user = mockUser;
  const signOut = () => {
    window.location.href = "/";
  };

  return (
    <div className="flex h-full w-64 flex-col bg-sidebar border-r border-sidebar-border">
      {/* Header */}
      <div className="flex h-14 items-center justify-between px-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-mono font-bold text-sm">
            CM
          </div>
          <span className="font-semibold tracking-tight">CodeMail</span>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Toggle theme</TooltipContent>
        </Tooltip>
      </div>

      {/* Actions */}
      <div className="p-3 space-y-2">
        <Link href="/mail/compose">
          <Button className="w-full justify-start gap-2" size="sm">
            <PenSquare className="h-4 w-4" />
            Compose
            <kbd className="ml-auto kbd">C</kbd>
          </Button>
        </Link>
        <Link href="/mail/search">
          <Button variant="outline" className="w-full justify-start gap-2" size="sm">
            <Search className="h-4 w-4" />
            Search
            <kbd className="ml-auto kbd">/</kbd>
          </Button>
        </Link>
      </div>

      <Separator />

      {/* Navigation */}
      <ScrollArea className="flex-1">
        <nav className="p-2 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.name} href={item.href}>
                <div
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                  {item.badge && (
                    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-medium text-primary-foreground">
                      {item.badge}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        <Separator className="my-2" />

        {/* Labels */}
        <div className="p-2">
          <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Labels
          </div>
          <div className="space-y-1">
            {labels.map((label) => (
              <Link key={label.name} href={`/mail/label/${label.name.toLowerCase()}`}>
                <div className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors">
                  <div className={cn("h-2 w-2 rounded-full", label.color)} />
                  {label.name}
                </div>
              </Link>
            ))}
            <Button variant="ghost" size="sm" className="w-full justify-start gap-3 px-3 text-muted-foreground">
              <Tag className="h-4 w-4" />
              Create label
            </Button>
          </div>
        </div>
      </ScrollArea>

      {/* Footer / User */}
      <Separator />
      <div className="p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 px-2 h-auto py-2"
            >
              <Avatar className="h-7 w-7">
                <AvatarImage src={user?.imageUrl} />
                <AvatarFallback className="text-xs">
                  {user?.firstName?.[0]}
                  {user?.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left">
                <div className="text-sm font-medium truncate">
                  {user?.fullName || "User"}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {user?.primaryEmailAddress?.emailAddress}
                </div>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem asChild>
              <Link href="/settings">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut()}
              className="text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
