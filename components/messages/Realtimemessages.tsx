"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { supabase } from "@/lib/supabase-browser";

type MessageRecord = {
  id: number;
  sender_id: string;
  content: string;
  read: boolean;
  created_at: string;
};

type AttachmentRecord = {
  id: number;
  message_id: number | null;
  file_name: string;
  file_size: number | null;
  signedUrl: string | null;
};

type RealtimeMessagesProps = {
  conversationId: number;
  userId: string;
  initialMessages: MessageRecord[];
  initialAttachments: AttachmentRecord[];
};

function formatTime(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}

function formatDay(date: string) {
  const messageDate = new Date(date);
  const today = new Date();

  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const isSameDay = (
    first: Date,
    second: Date,
  ) =>
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate();

  if (isSameDay(messageDate, today)) {
    return "Today";
  }

  if (isSameDay(messageDate, yesterday)) {
    return "Yesterday";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year:
      messageDate.getFullYear() !== today.getFullYear()
        ? "numeric"
        : undefined,
  }).format(messageDate);
}

export default function RealtimeMessages({
  conversationId,
  userId,
  initialMessages,
  initialAttachments,
}: RealtimeMessagesProps) {
  const [messages, setMessages] =
    useState<MessageRecord[]>(initialMessages);

  const [attachments, setAttachments] =
    useState<AttachmentRecord[]>(initialAttachments);

  const [
    isOtherUserTyping,
    setIsOtherUserTyping,
  ] = useState(false);

  const typingTimeoutRef =
    useRef<ReturnType<typeof setTimeout> | null>(
      null,
    );

  const bottomRef =
    useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const messageChannel = supabase
      .channel(
        `conversation-messages-${conversationId}`,
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMessage =
            payload.new as MessageRecord;

          setMessages((current) => {
            const exists = current.some(
              (message) =>
                message.id === newMessage.id,
            );

            if (exists) {
              return current;
            }

            return [...current, newMessage];
          });

          if (newMessage.sender_id !== userId) {
            setIsOtherUserTyping(false);

            if (typingTimeoutRef.current) {
              clearTimeout(
                typingTimeoutRef.current,
              );
            }
          }
        },
      )
      .subscribe();

    const readChannel = supabase
      .channel(
        `conversation-read-${conversationId}`,
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const updatedMessage =
            payload.new as MessageRecord;

          setMessages((current) =>
            current.map((message) =>
              message.id === updatedMessage.id
                ? updatedMessage
                : message,
            ),
          );
        },
      )
      .subscribe();

    const attachmentChannel = supabase
      .channel(
        `conversation-attachments-${conversationId}`,
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "message_attachments",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const newAttachment =
            payload.new as {
              id: number;
              message_id: number | null;
              file_name: string;
              file_size: number | null;
              storage_path: string;
            };

          const { data } =
            await supabase.storage
              .from("message-attachments")
              .createSignedUrl(
                newAttachment.storage_path,
                60 * 60,
              );

          setAttachments((current) => {
            const exists = current.some(
              (attachment) =>
                attachment.id ===
                newAttachment.id,
            );

            if (exists) {
              return current;
            }

            return [
              ...current,
              {
                id: newAttachment.id,
                message_id:
                  newAttachment.message_id,
                file_name:
                  newAttachment.file_name,
                file_size:
                  newAttachment.file_size,
                signedUrl:
                  data?.signedUrl ?? null,
              },
            ];
          });
        },
      )
      .subscribe();

    const typingChannel = supabase
      .channel(`typing-${conversationId}`)
      .on(
        "broadcast",
        {
          event: "typing",
        },
        ({ payload }) => {
          const typingPayload = payload as {
            userId: string;
            isTyping: boolean;
          };

          if (
            typingPayload.userId === userId
          ) {
            return;
          }

          setIsOtherUserTyping(
            typingPayload.isTyping,
          );

          if (typingTimeoutRef.current) {
            clearTimeout(
              typingTimeoutRef.current,
            );
          }

          if (typingPayload.isTyping) {
            typingTimeoutRef.current =
              setTimeout(() => {
                setIsOtherUserTyping(false);
              }, 2500);
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(
        messageChannel,
      );

      void supabase.removeChannel(
        readChannel,
      );

      void supabase.removeChannel(
        attachmentChannel,
      );

      void supabase.removeChannel(
        typingChannel,
      );

      if (typingTimeoutRef.current) {
        clearTimeout(
          typingTimeoutRef.current,
        );
      }
    };
  }, [conversationId, userId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [
    messages,
    attachments,
    isOtherUserTyping,
  ]);

  const attachmentsByMessage = useMemo(
    () => {
      const map = new Map<
        number,
        AttachmentRecord[]
      >();

      for (const attachment of attachments) {
        if (!attachment.message_id) {
          continue;
        }

        const current =
          map.get(attachment.message_id) ?? [];

        current.push(attachment);

        map.set(
          attachment.message_id,
          current,
        );
      }

      return map;
    },
    [attachments],
  );

  const lastOwnMessage = [...messages]
    .reverse()
    .find(
      (message) =>
        message.sender_id === userId,
    );

  return (
    <div className="space-y-4">
      {messages.length === 0 &&
        !isOtherUserTyping && (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <p className="text-slate-500">
              No messages yet. Start the
              conversation.
            </p>
          </div>
        )}

      {messages.map((message, index) => {
        const isOwnMessage =
          message.sender_id === userId;

        const messageAttachments =
          attachmentsByMessage.get(
            message.id,
          ) ?? [];

        const showSeen =
          isOwnMessage &&
          message.id === lastOwnMessage?.id &&
          message.read;

        const previousMessage =
          index > 0
            ? messages[index - 1]
            : null;

        const shouldShowDay =
          !previousMessage ||
          new Date(
            previousMessage.created_at,
          ).toDateString() !==
            new Date(
              message.created_at,
            ).toDateString();

        return (
          <div key={message.id}>
            {shouldShowDay && (
              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-200" />

                <span className="text-xs font-medium text-slate-400">
                  {formatDay(
                    message.created_at,
                  )}
                </span>

                <div className="h-px flex-1 bg-slate-200" />
              </div>
            )}

            <div
              className={`flex ${
                isOwnMessage
                  ? "justify-end"
                  : "justify-start"
              }`}
            >
              <div
                className={`max-w-[88%] rounded-2xl px-4 py-3 sm:max-w-[80%] sm:px-5 sm:py-4 ${
                  isOwnMessage
                    ? "bg-brand-500 text-white"
                    : "border border-slate-200 bg-white text-ink-950"
                }`}
              >
                <p className="whitespace-pre-wrap break-words leading-7">
                  {message.content}
                </p>

                {messageAttachments.length >
                  0 && (
                  <div className="mt-4 space-y-2">
                    {messageAttachments.map(
                      (attachment) => (
                        <div
                          key={attachment.id}
                          className={`rounded-xl px-4 py-3 ${
                            isOwnMessage
                              ? "bg-white/10"
                              : "bg-slate-50"
                          }`}
                        >
                          <p className="truncate text-sm font-semibold">
                            📎{" "}
                            {
                              attachment.file_name
                            }
                          </p>

                          <div className="mt-2 flex items-center justify-between gap-4">
                            <span
                              className={`text-xs ${
                                isOwnMessage
                                  ? "text-brand-100"
                                  : "text-slate-500"
                              }`}
                            >
                              {attachment.file_size
                                ? `${Math.round(
                                    attachment.file_size /
                                      1024,
                                  )} KB`
                                : "File"}
                            </span>

                            {attachment.signedUrl ? (
                              <a
                                href={
                                  attachment.signedUrl
                                }
                                target="_blank"
                                rel="noreferrer"
                                className={`text-xs font-semibold underline underline-offset-2 ${
                                  isOwnMessage
                                    ? "text-white"
                                    : "text-brand-600"
                                }`}
                              >
                                Open
                              </a>
                            ) : (
                              <span className="text-xs opacity-60">
                                Unavailable
                              </span>
                            )}
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                )}

                <div
                  className={`mt-2 flex items-center gap-2 ${
                    isOwnMessage
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >
                  <p
                    className={`text-xs ${
                      isOwnMessage
                        ? "text-brand-100"
                        : "text-slate-400"
                    }`}
                  >
                    {formatTime(
                      message.created_at,
                    )}
                  </p>

                  {showSeen && (
                    <span className="text-xs text-brand-100">
                      Seen
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {isOtherUserTyping && (
        <div className="flex justify-start">
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex h-4 items-center gap-1.5">
              <span className="h-2 w-2 animate-pulse rounded-full bg-slate-400" />

              <span className="h-2 w-2 animate-pulse rounded-full bg-slate-400 [animation-delay:150ms]" />

              <span className="h-2 w-2 animate-pulse rounded-full bg-slate-400 [animation-delay:300ms]" />
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}