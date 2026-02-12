"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import {
  Star,
  Paperclip,
  MoreHorizontal,
  Archive,
  Trash2,
  Mail,
  MailOpen,
} from "lucide-react";
import { cn, formatDate, truncate, getInitials } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { useMailShortcuts } from "@/hooks/use-keyboard-shortcuts";

interface Message {
  _id: string;
  from: { name?: string; address: string };
  subject: string;
  snippet: string;
  date: number;
  isRead: boolean;
  isStarred: boolean;
  labels: string[];
  attachments: { filename: string }[];
}

interface MessageListProps {
  messages: Message[];
  selectedId?: string;
  onSelect?: (id: string) => void;
  onStar?: (id: string) => void;
  onArchive?: (id: string) => void;
  onDelete?: (id: string) => void;
  onMarkRead?: (id: string, read: boolean) => void;
}

const labelColors: Record<string, string> = {
  work: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  personal: "bg-green-500/20 text-green-400 border-green-500/30",
  important: "bg-red-500/20 text-red-400 border-red-500/30",
  updates: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
};

export function MessageList({
  messages,
  selectedId,
  onSelect,
  onStar,
  onArchive,
  onDelete,
  onMarkRead,
}: MessageListProps) {
  const [focusedIndex, setFocusedIndex] = useState(0);

  const handleNavigateUp = useCallback(() => {
    setFocusedIndex((i) => Math.max(0, i - 1));
  }, []);

  const handleNavigateDown = useCallback(() => {
    setFocusedIndex((i) => Math.min(messages.length - 1, i + 1));
  }, [messages.length]);

  const handleOpen = useCallback(() => {
    if (messages[focusedIndex]) {
      onSelect?.(messages[focusedIndex]._id);
    }
  }, [messages, focusedIndex, onSelect]);

  const handleArchive = useCallback(() => {
    if (messages[focusedIndex]) {
      onArchive?.(messages[focusedIndex]._id);
    }
  }, [messages, focusedIndex, onArchive]);

  const handleStar = useCallback(() => {
    if (messages[focusedIndex]) {
      onStar?.(messages[focusedIndex]._id);
    }
  }, [messages, focusedIndex, onStar]);

  useMailShortcuts({
    onNavigateUp: handleNavigateUp,
    onNavigateDown: handleNavigateDown,
    onOpen: handleOpen,
    onArchive: handleArchive,
    onStar: handleStar,
  });

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <Mail className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium">No messages</h3>
        <p className="text-muted-foreground text-sm mt-1">
          Your inbox is empty
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {messages.map((message, index) => {
        const isFocused = index === focusedIndex;
        const isSelected = message._id === selectedId;
        const senderName = message.from.name || message.from.address.split("@")[0];

        return (
          <Link
            key={message._id}
            href={`/mail/${message._id}`}
            onClick={() => onSelect?.(message._id)}
          >
            <div
              className={cn(
                "message-row group flex items-start gap-3 p-4 cursor-pointer",
                !message.isRead && "bg-accent/30",
                isFocused && "ring-2 ring-inset ring-primary/50",
                isSelected && "selected"
              )}
              onMouseEnter={() => setFocusedIndex(index)}
            >
              {/* Avatar */}
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarFallback className="text-xs font-medium bg-muted">
                  {getInitials(senderName)}
                </AvatarFallback>
              </Avatar>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {/* Sender */}
                  <span
                    className={cn(
                      "text-sm truncate",
                      !message.isRead ? "font-semibold" : "font-medium"
                    )}
                  >
                    {senderName}
                  </span>

                  {/* Labels */}
                  {message.labels.slice(0, 2).map((label) => (
                    <Badge
                      key={label}
                      variant="outline"
                      className={cn(
                        "text-[10px] px-1.5 py-0 h-4",
                        labelColors[label.toLowerCase()] || "border-border"
                      )}
                    >
                      {label}
                    </Badge>
                  ))}

                  {/* Spacer */}
                  <div className="flex-1" />

                  {/* Attachment indicator */}
                  {message.attachments.length > 0 && (
                    <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                  )}

                  {/* Date */}
                  <span className="text-xs text-muted-foreground font-mono">
                    {formatDate(message.date)}
                  </span>
                </div>

                {/* Subject */}
                <div
                  className={cn(
                    "text-sm truncate mt-0.5",
                    !message.isRead ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {message.subject || "(no subject)"}
                </div>

                {/* Snippet */}
                <div className="text-xs text-muted-foreground truncate mt-0.5">
                  {truncate(message.snippet, 80)}
                </div>
              </div>

              {/* Actions (visible on hover) */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.preventDefault();
                        onStar?.(message._id);
                      }}
                    >
                      <Star
                        className={cn(
                          "h-4 w-4",
                          message.isStarred
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-muted-foreground"
                        )}
                      />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Star</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.preventDefault();
                        onArchive?.(message._id);
                      }}
                    >
                      <Archive className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Archive</TooltipContent>
                </Tooltip>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => e.preventDefault()}
                    >
                      <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.preventDefault();
                        onMarkRead?.(message._id, !message.isRead);
                      }}
                    >
                      {message.isRead ? (
                        <>
                          <Mail className="mr-2 h-4 w-4" /> Mark as unread
                        </>
                      ) : (
                        <>
                          <MailOpen className="mr-2 h-4 w-4" /> Mark as read
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.preventDefault();
                        onDelete?.(message._id);
                      }}
                      className="text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
