"use client";
import { useEffect, useMemo, useState } from "react";
import { MailWorkspace } from "./mail-workspace";
import { SetupCard } from "./setup-card";
import type { Folder, MailMessage, MailTransport } from "./types";

const demoMailbox = {
  _id: "preview-mailbox",
  name: "notify",
  address: "notify@uncap.us",
  displayName: "Notifications",
  role: "owner",
};
const examples = [
  [
    "Avery Chen",
    "avery@example.com",
    "A small idea for a big week",
    "I’ve been thinking about our conversation yesterday. What if we made the first step a little simpler?",
    "Hi Michael,\n\nI’ve been thinking about our conversation yesterday. What if we made the first step a little simpler?\n\nI sketched a few ideas over coffee. The best one is also the smallest: one clear place to start, and the confidence that everything else will follow.\n\nLet’s find half an hour this week to walk through it. Tuesday afternoon works well on my end.\n\nLooking forward to it,\nAvery",
    "People",
  ],
  [
    "Studio North",
    "hello@example.com",
    "The details make the difference",
    "Your updated design notes are ready. A quieter palette, a little more breathing room, and a clearer way through.",
    "Hello Michael,\n\nYour updated design notes are ready.\n\nA quieter palette. A little more breathing room. A clearer way through. We’ve focused on the details that make something feel considered, without getting in the way.\n\nThe next review is on Thursday.\n\nBest,\nThe Studio North team",
    "Projects",
  ],
  [
    "Cameron Brooks",
    "cameron@example.com",
    "Re: Friday, with a little less on the agenda",
    "That sounds perfect. Let’s keep it to the two things that really need a decision, and leave room for the rest.",
    "That sounds perfect.\n\nLet’s keep it to the two things that really need a decision, and leave room for the rest. I’ll bring the latest notes.\n\nSee you Friday,\nCameron",
    "",
  ],
  [
    "The Weekend Edit",
    "edit@example.com",
    "Good things take a little space",
    "This week: an independent bookshop, a trail worth taking, and a reminder to leave an afternoon unplanned.",
    "The Weekend Edit\n\nA few things worth your attention, at your own pace.\n\n01. A bookshop with no algorithm\n02. The long way home\n03. An afternoon with no plans\n\nUntil next week.",
    "Reading",
  ],
  [
    "Morgan Lee",
    "morgan@example.com",
    "Everything’s ready for Monday",
    "The checklist is complete, the handoff is in place, and there’s nothing urgent hiding in the details.",
    "Hi Michael,\n\nEverything’s ready for Monday.\n\nThe checklist is complete, the handoff is in place, and there’s nothing urgent hiding in the details. Take the weekend.\n\nMorgan",
    "Projects",
  ],
  [
    "Jamie Rivera",
    "jamie@example.com",
    "Coffee, whenever you have a moment",
    "No agenda. Just a good conversation and somewhere with decent coffee. How’s next Wednesday looking?",
    "Hey Michael,\n\nNo agenda. Just a good conversation and somewhere with decent coffee.\n\nHow’s next Wednesday looking?\n\nJamie",
    "People",
  ],
  [
    "Uncap",
    "updates@example.com",
    "A quieter inbox starts here",
    "Welcome to your new space. Familiar shortcuts, thoughtful details, and your conversations front and center.",
    "Welcome to Hustlemail.\n\nYour conversations, front and center.\n\nPress J and K to move through the inbox. E marks a conversation done. R starts a reply. C opens a fresh draft. And ? brings up your shortcuts whenever you need them.\n\nA little less noise. A little more focus.",
    "",
  ],
];
function createMessages(): MailMessage[] {
  return examples.map(
    ([name, address, subject, snippet, bodyText, label], index) => ({
      _id: `preview-${index}`,
      mailboxId: demoMailbox._id,
      from: { name, address },
      to: [{ address: demoMailbox.address }],
      subject,
      snippet,
      bodyText,
      date:
        Date.now() -
        (index < 3 ? (index + 1) * 25 * 60000 : (index - 1) * 86400000),
      receivedAt: Date.now() - (index + 1) * 60000,
      isRead: index > 2,
      isStarred: index === 1,
      isArchived: false,
      isTrashed: false,
      isSpam: false,
      isSent: false,
      isDraft: false,
      labels: label ? [label] : [],
      attachments: [],
    }),
  );
}
export function PreviewMail() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? (
    <PreviewWorkspace />
  ) : (
    <SetupCard
      title="A clearer inbox."
      description="Opening the sample workspace."
      loading
    />
  );
}
function PreviewWorkspace() {
  const [messages, setMessages] = useState(createMessages);
  const [folder, setFolder] = useState<Folder>("inbox");
  const [search, setSearch] = useState("");
  const transport = useMemo<MailTransport>(
    () => ({
      update: async (ids, patch) =>
        setMessages((current) =>
          current.map((message) =>
            ids.includes(message._id) ? { ...message, ...patch } : message,
          ),
        ),
      load: async (id) =>
        messages.find((message) => message._id === id) ?? null,
      saveDraft: async (draft) =>
        draft.id || `preview-draft-${draft.clientDraftId}`,
      discardDraft: async () => {},
      send: async () => {
        throw new Error("Sending is disabled in this sample preview.");
      },
      upload: async () => {
        throw new Error("Attachments are disabled in this sample preview.");
      },
    }),
    [messages],
  );
  return (
    <MailWorkspace
      userKey="sample-preview"
      userName="Michael"
      mailboxes={[demoMailbox]}
      mailboxId={demoMailbox._id}
      onMailboxChange={() => {}}
      messages={messages}
      folder={folder}
      onFolderChange={setFolder}
      search={search}
      onSearch={setSearch}
      transport={transport}
      online
      preview
      syncLabel="Sample mailbox"
    />
  );
}
