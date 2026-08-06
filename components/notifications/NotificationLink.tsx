"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { supabase } from "@/lib/supabase-browser";

type NotificationLinkProps = {
  variant?: "navbar" | "dashboard";
};

export default function NotificationLink({
  variant = "navbar",
}: NotificationLinkProps) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function loadUnreadCount() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (isMounted) {
          setUnreadCount(0);
        }

        return;
      }

      const { count, error } = await supabase
        .from("notifications")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("user_id", user.id)
        .eq("read", false);

      if (error) {
        console.error(
          "Unable to load notifications:",
          error.message,
        );

        return;
      }

      if (isMounted) {
        setUnreadCount(count ?? 0);
      }
    }

    void loadUnreadCount();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void loadUnreadCount();
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const displayedCount =
    unreadCount > 99 ? "99+" : unreadCount;

  if (variant === "dashboard") {
    return (
      <Link
        href="/notifications"
        className="relative rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-slate-300 transition hover:border-white/20 hover:bg-white/5 hover:text-white"
      >
        Notifications

        {unreadCount > 0 && (
          <span className="absolute -right-2 -top-2 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-brand-500 px-1.5 text-[10px] font-bold text-white">
            {displayedCount}
          </span>
        )}
      </Link>
    );
  }

  return (
    <Link
      href="/notifications"
      className="relative text-sm text-slate-300 transition hover:text-white"
    >
      Notifications

      {unreadCount > 0 && (
        <span className="absolute -right-5 -top-3 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-brand-500 px-1.5 text-[10px] font-bold text-white">
          {displayedCount}
        </span>
      )}
    </Link>
  );
}