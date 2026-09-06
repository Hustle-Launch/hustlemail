"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useAction,
  useConvex,
  useConvexAuth,
  useConvexConnectionState,
  useMutation,
  useQuery,
  usePaginatedQuery,
} from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { MailWorkspace } from "./mail-workspace";
import {
  applyPending,
  cacheKey,
  emptyCache,
  mergeMessages,
  readCache,
  writeCache,
} from "./cache";
import type { MailCache } from "./cache";
import { parseAddresses, belongsToFolder } from "./types";
import type {
  Draft,
  Folder,
  Mailbox,
  MailMessage,
  MailTransport,
} from "./types";
import { SetupCard } from "./setup-card";

export type LiveMailProps = {
  userId: string;
  userName?: string;
  onSignOut?: () => void;
  initialFolder?: Folder;
  initialMessageId?: string;
  initialCompose?: boolean;
};
export function LiveMail(props: LiveMailProps) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const session = useQuery(api.mail.session, isAuthenticated ? {} : "skip");
  const ensureUser = useMutation(api.mail.ensureUser);
  const bootstrap = useMutation(api.mail.bootstrap);
  const [error, setError] = useState<string | null>(null);
  const [settingUp, setSettingUp] = useState(false);
  const [offline, setOffline] = useState(false);
  const [previousSession, setPreviousSession] = useState<{
    userId: string;
    mailboxes: Mailbox[];
  }>({ userId: props.userId, mailboxes: [] });
  const previousMailboxes =
    previousSession.userId === props.userId ? previousSession.mailboxes : [];
  useEffect(() => {
    const key = `hustlemail:session:v1:${encodeURIComponent(props.userId)}`;
    const update = () => setOffline(!navigator.onLine);
    update();
    try {
      const cached = JSON.parse(localStorage.getItem(key) || "null");
      setPreviousSession({
        userId: props.userId,
        mailboxes: Array.isArray(cached?.mailboxes) ? cached.mailboxes : [],
      });
    } catch {
      /* No previously authorized offline session. */
    }
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, [props.userId]);
  useEffect(() => {
    if (!session?.authenticated || !session.mailboxes.length) return;
    setPreviousSession({ userId: props.userId, mailboxes: session.mailboxes });
    try {
      localStorage.setItem(
        `hustlemail:session:v1:${encodeURIComponent(props.userId)}`,
        JSON.stringify({ mailboxes: session.mailboxes }),
      );
    } catch {
      /* In-session offline cache remains available. */
    }
  }, [session, props.userId]);
  useEffect(() => {
    if (session?.authenticated && !session.user)
      void ensureUser({}).catch((error: Error) => setError(error.message));
  }, [session?.authenticated, session?.user, ensureUser]);
  if (offline && previousMailboxes.length)
    return (
      <ConnectedMail
        key={props.userId}
        {...props}
        mailboxes={previousMailboxes}
        authenticated={isAuthenticated}
      />
    );
  if (isLoading || (isAuthenticated && session === undefined))
    return (
      <SetupCard
        title="Your inbox is on its way."
        description="Connecting securely to your workspace."
        loading
      />
    );
  if (!isAuthenticated || !session?.authenticated)
    return (
      <SetupCard
        title="Finish connecting your account."
        description="Your sign-in is active, but the mailbox connection is not authenticated. Confirm that Clerk has a Convex JWT template and that the backend uses the same Clerk issuer."
        error={error}
      >
        <button onClick={() => window.location.reload()}>Reconnect</button>
        {props.onSignOut && <button onClick={props.onSignOut}>Sign out</button>}
      </SetupCard>
    );
  if (!session.mailboxes.length)
    return (
      <SetupCard
        title="A home for your mail."
        description={
          session.bootstrapAllowed
            ? "Your account is authorized for the notify@uncap.us pilot. Create the workspace to start using your mailbox."
            : "You’re signed in. Your account does not have a mailbox yet. Ask your workspace owner to grant access."
        }
        error={error}
      >
        {session.bootstrapAllowed && (
          <button
            className="hm-primary"
            disabled={settingUp}
            onClick={async () => {
              setSettingUp(true);
              setError(null);
              try {
                await bootstrap({});
              } catch (error) {
                setError(
                  error instanceof Error
                    ? error.message
                    : "Setup could not be completed.",
                );
              } finally {
                setSettingUp(false);
              }
            }}
          >
            {settingUp ? "Creating workspace…" : "Set up notify@uncap.us"}
          </button>
        )}
        {props.onSignOut && <button onClick={props.onSignOut}>Sign out</button>}
      </SetupCard>
    );
  return (
    <ConnectedMail
      key={props.userId}
      {...props}
      mailboxes={session.mailboxes}
      allowRetryInbound={session.bootstrapAllowed}
      userName={
        props.userName ||
        (session.user?.name === "Hustlemail user"
          ? session.user.email.split("@")[0]
          : session.user?.name) ||
        "Your workspace"
      }
    />
  );
}

function ConnectedMail({
  userId,
  userName,
  mailboxes,
  onSignOut,
  initialFolder,
  initialMessageId,
  initialCompose,
  authenticated = true,
  allowRetryInbound = false,
}: LiveMailProps & {
  mailboxes: Mailbox[];
  authenticated?: boolean;
  allowRetryInbound?: boolean;
}) {
  const convex = useConvex();
  const connection = useConvexConnectionState();
  const [mailboxId, setMailboxId] = useState(mailboxes[0]._id);
  const [folder, setFolder] = useState<Folder>(initialFolder ?? "inbox");
  const [search, setSearch] = useState("");
  const [cache, setCache] = useState<MailCache>(emptyCache);
  const cacheRef = useRef(cache);
  cacheRef.current = cache;
  const [browserOnline, setBrowserOnline] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replayToken, setReplayToken] = useState(0);
  const replaying = useRef(false);
  const key = cacheKey(userId, mailboxId);
  const keyRef = useRef(key);
  keyRef.current = key;
  const online =
    authenticated && browserOnline && connection.isWebSocketConnected;
  const onlineRef = useRef(online);
  onlineRef.current = online;
  const {
    results,
    status: paginationStatus,
    loadMore,
  } = usePaginatedQuery(
    api.mail.messages,
    authenticated
      ? {
          mailboxId: mailboxId as Id<"mailboxes">,
          folder,
          search: search.trim() || undefined,
        }
      : "skip",
    { initialNumItems: 50 },
  );
  const status = useQuery(api.mail.status, authenticated ? {} : "skip");
  const bulk = useMutation(api.mail.bulk);
  const saveDraftMutation = useMutation(api.mail.saveDraft);
  const discardDraftMutation = useMutation(api.mail.discardDraft);
  const sendMutation = useMutation(api.mail.send);
  const retrySendMutation = useMutation(api.mail.retrySend);
  const retryInboundMutation = useMutation(api.mail.retryInbound);
  const uploadAttachment = useAction(api.mail.uploadAttachment);
  const persist = useCallback((update: (current: MailCache) => MailCache) => {
    const next = update(cacheRef.current);
    cacheRef.current = next;
    setCache(next);
    if (!writeCache(keyRef.current, next))
      setError(
        "Device storage is unavailable. Keep this window open until your changes sync.",
      );
  }, []);
  useEffect(() => {
    cacheRef.current = readCache(key);
    setCache(cacheRef.current);
    setError(null);
  }, [key]);
  useEffect(() => {
    const update = () => setBrowserOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  const seenMessages = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!online || paginationStatus === "LoadingFirstPage") return;
    const fresh = results as MailMessage[];
    const liveIds = new Set(fresh.map((message) => message._id));
    persist((current) => ({
      ...current,
      messages: mergeMessages(
        paginationStatus === "Exhausted" && !search
          ? current.messages.filter(
              (message) =>
                !belongsToFolder(message, folder) || liveIds.has(message._id),
            )
          : current.messages,
        fresh,
      ),
    }));
    if (folder === "inbox" && seenMessages.current)
      for (const message of fresh)
        if (
          !seenMessages.current.has(message._id) &&
          message.receivedAt > Date.now() - 60000 &&
          !message.isRead
        )
          window.dispatchEvent(
            new CustomEvent("hustlemail:notify", {
              detail: {
                title: "New mail",
                body: "A new message arrived in Hustlemail.",
                messageId: message._id,
              },
            }),
          );
    seenMessages.current = new Set([
      ...(seenMessages.current ?? []),
      ...fresh.map((message) => message._id),
    ]);
  }, [results, paginationStatus, search, folder, persist, online]);
  useEffect(() => {
    seenMessages.current = null;
  }, [mailboxId]);
  useEffect(() => {
    if (!online || !cache.pending.length || replaying.current) return;
    const replayKey = key;
    replaying.current = true;
    void (async () => {
      try {
        while (
          onlineRef.current &&
          keyRef.current === replayKey &&
          cacheRef.current.pending.length
        ) {
          const action = cacheRef.current.pending[0];
          await bulk({
            ids: action.ids as Id<"messages">[],
            patch: action.patch,
          });
          if (keyRef.current !== replayKey) break;
          persist((current) => ({
            ...current,
            messages: applyPending(current.messages, [action]),
            pending: current.pending.filter((item) => item.id !== action.id),
          }));
        }
        setError(null);
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Changes could not sync. Your pending actions are still saved on this device.",
        );
      } finally {
        replaying.current = false;
      }
    })();
  }, [online, cache.pending.length, key, replayToken, bulk, persist]);
  const save = useCallback(
    async (draft: Draft) => {
      if (!onlineRef.current) throw new Error("waiting for connection");
      return await saveDraftMutation({
        id: draft.id as Id<"messages"> | undefined,
        clientDraftId: draft.clientDraftId,
        mailboxId: draft.mailboxId as Id<"mailboxes">,
        to: parseAddresses(draft.to),
        cc: parseAddresses(draft.cc),
        bcc: parseAddresses(draft.bcc),
        subject: draft.subject,
        text: draft.text,
        inReplyTo: draft.inReplyTo as Id<"messages"> | undefined,
        attachments: draft.attachments.map((attachment) => {
          if (!attachment.storageId)
            throw new Error("An attachment has not finished uploading.");
          return {
            filename: attachment.filename,
            contentType: attachment.contentType,
            size: attachment.size,
            storageId: attachment.storageId as Id<"_storage">,
          };
        }),
      });
    },
    [saveDraftMutation],
  );
  const transport = useMemo<MailTransport>(
    () => ({
      update: async (ids, patch) => {
        if (ids.length > 100)
          throw new Error("Select no more than 100 messages at a time.");
        persist((current) => ({
          ...current,
          pending: [
            ...current.pending,
            { id: crypto.randomUUID(), ids, patch, createdAt: Date.now() },
          ],
        }));
      },
      load: async (id) => {
        const requestKey = keyRef.current;
        const cached = applyPending(
          cacheRef.current.messages,
          cacheRef.current.pending,
        ).find((message) => message._id === id);
        if (!onlineRef.current) {
          if (
            cached &&
            (cached.bodyText !== undefined || cached.bodyHtml !== undefined)
          )
            return {
              ...cached,
              attachments: cached.attachments.map((attachment) => ({
                ...attachment,
                url: null,
              })),
            };
          throw new Error(
            "This message hasn’t been downloaded. Reconnect to read it.",
          );
        }
        const detail = await convex.query(api.mail.details, {
          id: id as Id<"messages">,
        });
        if (!detail) return null;
        let full: MailMessage = detail;
        if (detail.bodyUrl && !detail.bodyText && !detail.bodyHtml) {
          const response = await fetch(detail.bodyUrl, {
            referrerPolicy: "no-referrer",
          });
          if (!response.ok)
            throw new Error("The message body could not be downloaded.");
          const body = (await response.json()) as {
            text?: string;
            html?: string;
          };
          full = { ...full, bodyText: body.text, bodyHtml: body.html };
        }
        if (requestKey !== keyRef.current)
          throw new Error(
            "The active mailbox changed. Open the message again.",
          );
        persist((current) => ({
          ...current,
          messages: mergeMessages(current.messages, [full]),
        }));
        return full;
      },
      saveDraft: save,
      discardDraft: async (draft) => {
        if (draft.id) {
          if (!onlineRef.current)
            throw new Error("Reconnect to discard a synced draft.");
          await discardDraftMutation({ id: draft.id as Id<"messages"> });
          persist((current) => ({
            ...current,
            messages: current.messages.filter(
              (message) => message._id !== draft.id,
            ),
          }));
        }
      },
      send: async (draft) => {
        if (!onlineRef.current) throw new Error("Reconnect before sending.");
        const id = await save(draft);
        await sendMutation({
          draftId: id,
          idempotencyKey: `send-${draft.clientDraftId}`,
        });
      },
      upload: async (file, selectedMailbox) => {
        if (!onlineRef.current)
          throw new Error("Reconnect to upload attachments.");
        return await uploadAttachment({
          mailboxId: selectedMailbox as Id<"mailboxes">,
          filename: file.name,
          contentType: file.type || "application/octet-stream",
          data: await file.arrayBuffer(),
        });
      },
      retry: async (queueId) => {
        if (!onlineRef.current) throw new Error("Reconnect to retry delivery.");
        await retrySendMutation({ id: queueId as Id<"outboundQueue"> });
      },
    }),
    [
      convex,
      persist,
      save,
      discardDraftMutation,
      sendMutation,
      uploadAttachment,
      retrySendMutation,
    ],
  );
  const allMessages = useMemo(() => {
    const cachedById = new Map(
      cache.messages.map((message) => [message._id, message]),
    );
    const authoritative = online
      ? (results as MailMessage[]).map((message) => ({
          ...cachedById.get(message._id),
          ...message,
        }))
      : cache.messages;
    return applyPending(authoritative, cache.pending);
  }, [online, cache.messages, cache.pending, results]);
  return (
    <MailWorkspace
      userKey={userId}
      userName={userName || "Your workspace"}
      mailboxes={mailboxes}
      mailboxId={mailboxId}
      onMailboxChange={setMailboxId}
      messages={allMessages}
      folder={folder}
      onFolderChange={setFolder}
      search={search}
      onSearch={setSearch}
      transport={transport}
      online={online}
      serverSearch={online}
      loading={
        paginationStatus === "LoadingFirstPage" ||
        paginationStatus === "LoadingMore"
      }
      hasMore={paginationStatus === "CanLoadMore" && online}
      onLoadMore={() => loadMore(50)}
      pendingCount={cache.pending.length}
      syncLabel={
        !status?.configured
          ? "Receiving not configured"
          : status.failedInbound || status.failedOutbound || status.lastError
            ? "Needs attention"
            : status.lastSuccessAt
              ? "Mailbox connected"
              : "Waiting for first sync"
      }
      error={
        error ||
        (status?.failedInbound
          ? `${status.failedInbound} incoming message${status.failedInbound === 1 ? " needs" : "s need"} attention. ${status.inboundError || "The receiving service will retry."}`
          : null) ||
        status?.lastError ||
        (status?.failedOutbound
          ? `${status.failedOutbound} message${status.failedOutbound === 1 ? "" : "s"} could not be delivered. Open Sent to review and retry.`
          : null) ||
        (!status?.configured && status
          ? "Receiving and sending need a Resend key on the backend."
          : null)
      }
      onRetry={
        error || (online && allowRetryInbound && status?.failedInbound)
          ? () => {
              setError(null);
              setReplayToken((value) => value + 1);
              if (online && allowRetryInbound && status?.failedInbound) {
                void retryInboundMutation({}).catch((error: Error) =>
                  setError(
                    error.message || "Incoming messages could not be retried.",
                  ),
                );
              }
            }
          : undefined
      }
      onRetryAttachments={
        online && allowRetryInbound
          ? () => {
              void retryInboundMutation({}).catch((error: Error) =>
                setError(error.message || "Attachments could not be retried."),
              );
            }
          : undefined
      }
      onSignOut={onSignOut}
      initialMessageId={initialMessageId}
      initialCompose={initialCompose}
    />
  );
}
