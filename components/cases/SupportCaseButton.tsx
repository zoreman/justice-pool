"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase-browser";

type SupportCaseButtonProps = {
  caseId: string;
  userId: string | null;
  initialSupported: boolean;
};

export default function SupportCaseButton({
  caseId,
  userId,
  initialSupported,
}: SupportCaseButtonProps) {
  const router = useRouter();

  const [isSupported, setIsSupported] = useState(initialSupported);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSupport() {
    if (!userId || isLoading) {
      return;
    }

    setIsLoading(true);
    setMessage("");

    if (isSupported) {
      const { error } = await supabase
        .from("case_supporters")
        .delete()
        .eq("case_id", caseId)
        .eq("user_id", userId);

      if (error) {
        setMessage(error.message);
        setIsLoading(false);
        return;
      }

      setIsSupported(false);
    } else {
      const { error } = await supabase.from("case_supporters").insert({
        case_id: caseId,
        user_id: userId,
      });

      if (error) {
        setMessage(error.message);
        setIsLoading(false);
        return;
      }

      setIsSupported(true);
    }

    setIsLoading(false);
    router.refresh();
  }

  if (!userId) {
    return (
      <Link
        href="/login"
        className="flex items-center justify-center rounded-2xl border border-white/10 px-6 py-4 font-semibold text-slate-300 transition hover:bg-white/5 hover:text-white"
      >
        Sign in to support
      </Link>
    );
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={handleSupport}
        disabled={isLoading}
        className={`rounded-2xl border px-6 py-4 font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
          isSupported
            ? "border-brand-400/30 bg-brand-500/10 text-brand-200 hover:bg-brand-500/15"
            : "border-white/10 text-slate-300 hover:bg-white/5 hover:text-white"
        }`}
      >
        {isLoading
          ? "Updating..."
          : isSupported
            ? "Following this case"
            : "Follow this case"}
      </button>

      {message && (
        <p className="mt-3 text-center text-sm text-red-300">{message}</p>
      )}
    </div>
  );
}