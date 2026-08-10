"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import { supabase } from "@/lib/supabase-browser";

type MessageComposerProps = {
  conversationId: number;
  userId: string;
  action: (
    conversationId: number,
    formData: FormData,
  ) => Promise<void>;
};

export default function MessageComposer({
  conversationId,
  userId,
  action,
}: MessageComposerProps) {
  const [content, setContent] =
    useState("");

  const channelRef = useRef<
    ReturnType<typeof supabase.channel> | null
  >(null);

  const typingTimeoutRef =
    useRef<ReturnType<typeof setTimeout> | null>(
      null,
    );

  useEffect(() => {
    const channel = supabase
      .channel(`typing-${conversationId}`)
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(
          typingTimeoutRef.current,
        );
      }

      void channel.send({
        type: "broadcast",
        event: "typing",
        payload: {
          userId,
          isTyping: false,
        },
      });

      void supabase.removeChannel(channel);

      channelRef.current = null;
    };
  }, [conversationId, userId]);

  async function broadcastTyping(
    isTyping: boolean,
  ) {
    const channel = channelRef.current;

    if (!channel) {
      return;
    }

    await channel.send({
      type: "broadcast",
      event: "typing",
      payload: {
        userId,
        isTyping,
      },
    });
  }

  function handleChange(
    value: string,
  ) {
    setContent(value);

    const hasContent =
      value.trim().length > 0;

    void broadcastTyping(hasContent);

    if (typingTimeoutRef.current) {
      clearTimeout(
        typingTimeoutRef.current,
      );
    }

    if (hasContent) {
      typingTimeoutRef.current =
        setTimeout(() => {
          void broadcastTyping(false);
        }, 1200);
    }
  }

  return (
    <form
      action={async (formData) => {
        await broadcastTyping(false);

        setContent("");

        await action(
          conversationId,
          formData,
        );
      }}
      className="mt-4 flex gap-3"
    >
      <textarea
        name="content"
        rows={2}
        required
        value={content}
        onChange={(event) =>
          handleChange(
            event.target.value,
          )
        }
        onBlur={() => {
          void broadcastTyping(false);
        }}
        placeholder="Write a message..."
        className="min-h-[56px] flex-1 resize-none rounded-2xl border border-slate-300 bg-white px-4 py-3 text-ink-950 outline-none transition placeholder:text-slate-400 focus:border-brand-500"
      />

      <button
        type="submit"
        disabled={!content.trim()}
        className="self-end rounded-2xl bg-brand-500 px-6 py-4 font-semibold text-white transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Send
      </button>
    </form>
  );
}