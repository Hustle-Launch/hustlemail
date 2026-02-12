"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import {
  X,
  Send,
  Paperclip,
  Bold,
  Italic,
  List,
  ListOrdered,
  LinkIcon,
  Trash2,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ComposeEditorProps {
  initialTo?: string;
  initialSubject?: string;
  initialBody?: string;
  replyTo?: {
    from: { name?: string; address: string };
    subject: string;
    body?: string;
  };
  onSend?: (data: {
    to: string[];
    cc: string[];
    bcc: string[];
    subject: string;
    body: string;
    attachments: File[];
  }) => Promise<void>;
  onDiscard?: () => void;
}

export function ComposeEditor({
  initialTo = "",
  initialSubject = "",
  initialBody = "",
  replyTo,
  onSend,
  onDiscard,
}: ComposeEditorProps) {
  const router = useRouter();
  const [to, setTo] = useState(initialTo || replyTo?.from.address || "");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [subject, setSubject] = useState(
    initialSubject || (replyTo ? `Re: ${replyTo.subject}` : "")
  );
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSending, setIsSending] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
      }),
      Placeholder.configure({
        placeholder: "Write your message...",
      }),
    ],
    content: initialBody || (replyTo?.body ? `<br><br><blockquote>${replyTo.body}</blockquote>` : ""),
    editorProps: {
      attributes: {
        class: "tiptap-editor min-h-[200px] p-4 focus:outline-none",
      },
    },
  });

  const handleSend = useCallback(async () => {
    if (!to.trim()) return;
    
    setIsSending(true);
    try {
      await onSend?.({
        to: to.split(",").map((e) => e.trim()).filter(Boolean),
        cc: cc.split(",").map((e) => e.trim()).filter(Boolean),
        bcc: bcc.split(",").map((e) => e.trim()).filter(Boolean),
        subject,
        body: editor?.getHTML() || "",
        attachments,
      });
      router.push("/mail/inbox");
    } catch (error) {
      console.error("Failed to send:", error);
    } finally {
      setIsSending(false);
    }
  }, [to, cc, bcc, subject, editor, attachments, onSend, router]);

  const handleDiscard = useCallback(() => {
    if (onDiscard) {
      onDiscard();
    } else {
      router.push("/mail/inbox");
    }
  }, [onDiscard, router]);

  const handleAttachment = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments((prev) => [...prev, ...files]);
    e.target.value = "";
  }, []);

  const removeAttachment = useCallback((index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b shrink-0">
        <h2 className="font-semibold">
          {replyTo ? "Reply" : "New Message"}
        </h2>
        <div className="flex-1" />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={handleDiscard}>
              <X className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Discard</TooltipContent>
        </Tooltip>
      </div>

      {/* Recipients */}
      <div className="border-b shrink-0">
        <div className="flex items-center px-4 py-2 gap-2">
          <span className="text-sm text-muted-foreground w-12">To</span>
          <Input
            type="email"
            placeholder="recipients@example.com"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="border-0 shadow-none focus-visible:ring-0 px-0 h-auto py-1"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                Cc/Bcc
                <ChevronDown className="ml-1 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setShowCc(!showCc)}>
                {showCc ? "Hide" : "Show"} Cc
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowBcc(!showBcc)}>
                {showBcc ? "Hide" : "Show"} Bcc
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {showCc && (
          <div className="flex items-center px-4 py-2 gap-2 border-t">
            <span className="text-sm text-muted-foreground w-12">Cc</span>
            <Input
              type="email"
              placeholder="cc@example.com"
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              className="border-0 shadow-none focus-visible:ring-0 px-0 h-auto py-1"
            />
          </div>
        )}

        {showBcc && (
          <div className="flex items-center px-4 py-2 gap-2 border-t">
            <span className="text-sm text-muted-foreground w-12">Bcc</span>
            <Input
              type="email"
              placeholder="bcc@example.com"
              value={bcc}
              onChange={(e) => setBcc(e.target.value)}
              className="border-0 shadow-none focus-visible:ring-0 px-0 h-auto py-1"
            />
          </div>
        )}

        <div className="flex items-center px-4 py-2 gap-2 border-t">
          <span className="text-sm text-muted-foreground w-12">Subject</span>
          <Input
            type="text"
            placeholder="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="border-0 shadow-none focus-visible:ring-0 px-0 h-auto py-1"
          />
        </div>
      </div>

      {/* Editor toolbar */}
      <div className="flex items-center gap-1 px-4 py-2 border-b shrink-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => editor?.chain().focus().toggleBold().run()}
              data-active={editor?.isActive("bold")}
            >
              <Bold className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Bold</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              data-active={editor?.isActive("italic")}
            >
              <Italic className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Italic</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-5 mx-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
              data-active={editor?.isActive("bulletList")}
            >
              <List className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Bullet list</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
              data-active={editor?.isActive("orderedList")}
            >
              <ListOrdered className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Numbered list</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-5 mx-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                const url = window.prompt("Enter URL:");
                if (url) {
                  editor?.chain().focus().setLink({ href: url }).run();
                }
              }}
            >
              <LinkIcon className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Insert link</TooltipContent>
        </Tooltip>

        <div className="flex-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <label>
              <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                <span>
                  <Paperclip className="h-4 w-4" />
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleAttachment}
                  />
                </span>
              </Button>
            </label>
          </TooltipTrigger>
          <TooltipContent>Attach file</TooltipContent>
        </Tooltip>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-auto">
        <EditorContent editor={editor} />
      </div>

      {/* Attachments */}
      {attachments.length > 0 && (
        <div className="border-t p-4 shrink-0">
          <div className="flex flex-wrap gap-2">
            {attachments.map((file, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted text-sm"
              >
                <Paperclip className="h-3.5 w-3.5" />
                <span className="truncate max-w-[150px]">{file.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={() => removeAttachment(i)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center gap-2 px-4 py-3 border-t shrink-0">
        <Button onClick={handleSend} disabled={!to.trim() || isSending}>
          <Send className="mr-2 h-4 w-4" />
          {isSending ? "Sending..." : "Send"}
        </Button>
        <Button variant="outline" onClick={handleDiscard}>
          <Trash2 className="mr-2 h-4 w-4" />
          Discard
        </Button>
        <div className="flex-1" />
        <span className="text-xs text-muted-foreground font-mono">
          ⌘ + Enter to send
        </span>
      </div>
    </div>
  );
}
