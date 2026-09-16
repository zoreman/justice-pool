"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { toggleCaseSupport } from "@/app/cases/[id]/support-actions";

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

  const [isSupported, setIsSupported] =
    useState(initialSupported);

  const [isLoading, setIsLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  async function handleSupport() {
    if (!userId || isLoading) {
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      const result =
        await toggleCaseSupport(caseId);

      setIsSupported(result.supported);

      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to update support status.",
      );
    } finally {
      setIsLoading(false);
    }
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
        aria-busy={isLoading}
        aria-pressed={isSupported}
        className={`flex w-full items-center justify-center gap-2 rounded-2xl border px-6 py-4 font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
          isSupported
            ? "border-brand-400/30 bg-brand-500/10 text-brand-200 hover:bg-brand-500/15"
            : "border-white/10 text-slate-300 hover:bg-white/5 hover:text-white"
        }`}
      >
        {isLoading && (
          <span
            aria-hidden="true"
            className="h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current"
          />
        )}

        {isLoading
          ? isSupported
            ? "Unfollowing..."
            : "Following..."
          : isSupported
            ? "Following this case"
            : "Follow this case"}
      </button>

      {message && (
        <p
          role="alert"
          className="mt-3 text-center text-sm text-red-300"
        >
          {message}
        </p>
      )}
    </div>
  );
}