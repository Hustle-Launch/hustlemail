/**
 * Message view component for displaying a single email or thread.
 * Supports thread expansion, attachments, and reply actions.
 * @module components/mail/message-view
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Star,
  Archive,
  Trash,
  Reply,
  ReplyAll,
  Forward,
  MoreHorizontal,
  Paperclip,
  Download,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "@phosphor-icons/react";
import { cn, formatDate, formatFileSize, getInitials } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
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

/** Email attachment metadata. */
interface Attachment {
  filename: string;
  contentType: string;
  size: number;
  storageId?: string;
  externalUrl?: string;
}

/** Full message data structure for detail view. */
interface Message {
  _id: string;
  from: { name?: string; address: string };
  to: { name?: string; address: string }[];
  cc?: { name?: string; address: string }[];
  subject: string;
  bodyHtml?: string;
  bodyText?: string;
  date: number;
  isRead: boolean;
  isStarred: boolean;
  labels: string[];
  attachments: Attachment[];
  threadId?: string;
}

/** Thread message with expansion state. */
interface ThreadMessage extends Message {
  isExpanded?: boolean;
}

/** Props for the MessageView component. */
interface MessageViewProps {
  message: Message;
  threadMessages?: ThreadMessage[];
  onStar?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
  onReply?: () => void;
  onForward?: () => void;
}

/**
 * Renders a single attachment with download action.
 * @param attachment - Attachment metadata to display.
 * @returns The attachment item element.
 */
function AttachmentItem({ attachment }: { attachment: Attachment }) {
  const isImage = attachment.contentType.startsWith("image/");
  
  return (
    <div className="flex items-center gap-3 p-3 rounded-md border bg-muted/30 hover:bg-muted/50 transition-colors group">
      <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
        {isImage ? (
          <div className="h-10 w-10 rounded bg-gradient-to-br from-blue-500/20 to-purple-500/20" />
        ) : (
          <Paperclip className="h-5 w-5 text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{attachment.filename}</div>
        <div className="text-xs text-muted-foreground">
          {formatFileSize(attachment.size)}
        </div>
      </div>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Download className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Download</TooltipContent>
      </Tooltip>
    </div>
  );
}

/**
 * Renders a single message in a thread with expand/collapse.
 * @param message - The message data.
 * @param isExpanded - Whether the message body is visible.
 * @param onToggle - Callback to toggle expansion.
 * @returns The thread message item element.
 */
function ThreadMessageItem({
  message,
  isExpanded,
  onToggle,
}: {
  message: ThreadMessage;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const senderName = message.from.name || message.from.address.split("@")[0];

  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors text-left"
      >
        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-xs">
            {getInitials(senderName)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{senderName}</span>
            <span className="text-xs text-muted-foreground">
              {formatDate(message.date)}
            </span>
          </div>
          {!isExpanded && (
            <div className="text-xs text-muted-foreground truncate">
              {message.bodyText?.slice(0, 100) || "No preview available"}
            </div>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      
      {isExpanded && (
        <div className="px-4 pb-4">
          <div className="pl-11">
            {/* Recipients */}
            <div className="text-xs text-muted-foreground mb-4">
              <span>to: </span>
              {message.to.map((r, i) => (
                <span key={r.address}>
                  {r.name || r.address}
                  {i < message.to.length - 1 && ", "}
                </span>
              ))}
              {message.cc && message.cc.length > 0 && (
                <>
                  <br />
                  <span>cc: </span>
                  {message.cc.map((r, i) => (
                    <span key={r.address}>
                      {r.name || r.address}
                      {i < message.cc!.length - 1 && ", "}
                    </span>
                  ))}
                </>
              )}
            </div>

            {/* Body */}
            {message.bodyHtml ? (
              <div
                className="prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: message.bodyHtml }}
              />
            ) : (
              <pre className="text-sm whitespace-pre-wrap font-sans">
                {message.bodyText}
              </pre>
            )}

            {/* Attachments */}
            {message.attachments.length > 0 && (
              <div className="mt-4 space-y-2">
                {message.attachments.map((attachment, i) => (
                  <AttachmentItem key={i} attachment={attachment} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Full message/thread view with header actions and reply.
 * @param message - Primary message to display.
 * @param threadMessages - Optional array of thread messages.
 * @param onStar - Star action callback.
 * @param onArchive - Archive action callback.
 * @param onDelete - Delete action callback.
 * @param onReply - Reply action callback.
 * @param onForward - Forward action callback.
 * @returns The message view element.
 */
export function MessageView({
  message,
  threadMessages = [],
  onStar,
  onArchive,
  onDelete,
  onReply,
  onForward,
}: MessageViewProps) {
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(
    new Set([message._id])
  );
  const senderName = message.from.name || message.from.address.split("@")[0];
  const allMessages = threadMessages.length > 0 ? threadMessages : [message];

  const toggleMessage = (id: string) => {
    setExpandedMessages((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 p-4 border-b shrink-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" asChild>
              <Link href="/mail/inbox">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Back to inbox</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-6" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={onArchive}>
              <Archive className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Archive (e)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={onDelete}>
              <Trash className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Delete (#)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={onStar}>
              <Star
                className={cn(
                  "h-4 w-4",
                  message.isStarred
                    ? "fill-yellow-400 text-yellow-400"
                    : ""
                )}
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Star (s)</TooltipContent>
        </Tooltip>

        <div className="flex-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={onReply}>
              <Reply className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Reply (r)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon">
              <ReplyAll className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Reply all</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={onForward}>
              <Forward className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Forward</TooltipContent>
        </Tooltip>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <ExternalLink className="mr-2 h-4 w-4" />
              Open in new window
            </DropdownMenuItem>
            <DropdownMenuItem>Print</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Mark as spam</DropdownMenuItem>
            <DropdownMenuItem>Block sender</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Subject */}
      <div className="p-4 border-b shrink-0">
        <h1 className="text-xl font-semibold">
          {message.subject || "(no subject)"}
        </h1>
        <div className="flex items-center gap-2 mt-2">
          {message.labels.map((label) => (
            <Badge key={label} variant="secondary" className="text-xs">
              {label}
            </Badge>
          ))}
          {threadMessages.length > 1 && (
            <span className="text-xs text-muted-foreground">
              {threadMessages.length} messages in thread
            </span>
          )}
        </div>
      </div>

      {/* Thread / Messages */}
      <ScrollArea className="flex-1">
        <div className="divide-y divide-border">
          {allMessages.map((msg) => (
            <ThreadMessageItem
              key={msg._id}
              message={msg}
              isExpanded={expandedMessages.has(msg._id)}
              onToggle={() => toggleMessage(msg._id)}
            />
          ))}
        </div>
      </ScrollArea>

      {/* Quick reply */}
      <div className="p-4 border-t shrink-0">
        <Button onClick={onReply} className="w-full" variant="outline">
          <Reply className="mr-2 h-4 w-4" />
          Reply
        </Button>
      </div>
    </div>
  );
}
