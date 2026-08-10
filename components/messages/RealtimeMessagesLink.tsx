"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase-browser";

type RealtimeMessagesLinkProps = {
  userId: string;
  conversationIds: number[];
  initialUnreadCount: number;
};

export default function RealtimeMessagesLink({
  userId,
  conversationIds,
  initialUnreadCount,
}: RealtimeMessagesLinkProps) {
  const [unreadCount, setUnreadCount] =
    useState(initialUnreadCount);

  useEffect(() => {
    if (conversationIds.length === 0) {
      return;
    }

    const channel = supabase
      .channel(`unread-messages-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const newMessage = payload.new as {
            conversation_id: number;
            sender_id: string;
          };

          if (
            newMessage.sender_id !== userId &&
            conversationIds.includes(
              newMessage.conversation_id,
            )
          ) {
            setUnreadCount((current) => current + 1);
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationIds, userId]);

  return (
    <Link
      href="/messages"
      className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-ink-950"
    >
      <span>Messages</span>

      {unreadCount > 0 && (
        <span className="flex min-h-5 min-w-5 items-center justify-center rounded-full bg-brand-500 px-1.5 text-[10px] font-bold text-white">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Link>
  );
}