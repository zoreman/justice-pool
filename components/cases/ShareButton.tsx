"use client";

import { useState } from "react";

import { supabase } from "@/lib/supabase-browser";

type ShareButtonProps = {
  caseId: string;
  title: string;
};

function createVisitorId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function ShareButton({
  caseId,
  title,
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  async function recordShare() {
    const storageKey = "justice-pool-visitor-id";

    let visitorId = window.localStorage.getItem(storageKey);

    if (!visitorId) {
      visitorId = createVisitorId();
      window.localStorage.setItem(storageKey, visitorId);
    }

    const { error } = await supabase.rpc("record_case_share", {
      case_id_input: caseId,
      visitor_id_input: visitorId,
    });

    if (error) {
      console.error("Unable to record share:", error.message);
    }
  }

  async function handleShare() {
    if (isSharing) {
      return;
    }

    setIsSharing(true);

    const url = window.location.href;
    let completed = false;

    try {
      if (navigator.share) {
        await navigator.share({
          title,
          url,
        });

        completed = true;
      } else {
        await navigator.clipboard.writeText(url);

        setCopied(true);
        completed = true;

        window.setTimeout(() => {
          setCopied(false);
        }, 2000);
      }

      if (completed) {
        await recordShare();
      }
    } catch (error) {
      if (
        error instanceof DOMException &&
        error.name === "AbortError"
      ) {
        setIsSharing(false);
        return;
      }

      console.error("Unable to share case:", error);
    }

    setIsSharing(false);
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      disabled={isSharing}
      className="flex w-full items-center justify-center rounded-2xl border border-white/10 px-5 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isSharing
        ? "Sharing..."
        : copied
          ? "✓ Copied"
          : "Share case"}
    </button>
  );
}