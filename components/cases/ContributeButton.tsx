"use client";

import { useState } from "react";
import Link from "next/link";

type ContributeButtonProps = {
  caseId: string;
  userId: string | null;
};

const presetAmounts = [25, 50, 100];

export default function ContributeButton({
  caseId,
  userId,
}: ContributeButtonProps) {
  const [selectedAmount, setSelectedAmount] = useState(50);
  const [customAmount, setCustomAmount] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  const amountInDollars =
    customAmount.trim().length > 0
      ? Number(customAmount)
      : selectedAmount;

  async function handleCheckout() {
    if (!userId || isLoading) {
      return;
    }

    setMessage("");

    if (
      !Number.isFinite(amountInDollars) ||
      amountInDollars < 1 ||
      amountInDollars > 10000
    ) {
      setMessage("Enter an amount between $1 and $10,000.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          caseId,
          amount: Math.round(amountInDollars * 100),
          anonymous,
        }),
      });

      const result = (await response.json()) as {
        url?: string;
        error?: string;
      };

      if (!response.ok || !result.url) {
        setMessage(result.error ?? "Unable to start checkout.");
        setIsLoading(false);
        return;
      }

      window.location.href = result.url;
    } catch {
      setMessage("Something went wrong while starting checkout.");
      setIsLoading(false);
    }
  }

  if (!userId) {
    return (
      <Link
        href="/login"
        className="mt-8 flex w-full items-center justify-center rounded-2xl bg-brand-500 px-6 py-4 font-semibold text-white transition hover:bg-brand-400"
      >
        Sign in to contribute
      </Link>
    );
  }

  return (
    <div className="mt-8">
      <p className="text-sm font-medium text-slate-300">
        Choose an amount
      </p>

      <div className="mt-3 grid grid-cols-3 gap-3">
        {presetAmounts.map((amount) => {
          const isSelected =
            customAmount === "" && selectedAmount === amount;

          return (
            <button
              key={amount}
              type="button"
              onClick={() => {
                setSelectedAmount(amount);
                setCustomAmount("");
              }}
              className={`rounded-xl border px-3 py-3 text-sm font-semibold transition ${
                isSelected
                  ? "border-brand-400 bg-brand-500/15 text-white"
                  : "border-white/10 text-slate-300 hover:bg-white/5"
              }`}
            >
              ${amount}
            </button>
          );
        })}
      </div>

      <div className="relative mt-3">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
          $
        </span>

        <input
          type="number"
          min="1"
          max="10000"
          step="1"
          value={customAmount}
          onChange={(event) => setCustomAmount(event.target.value)}
          placeholder="Custom amount"
          className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-8 pr-4 text-white outline-none transition placeholder:text-slate-500 focus:border-brand-400"
        />
      </div>

      <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm leading-6 text-slate-400">
        <input
          type="checkbox"
          checked={anonymous}
          onChange={(event) => setAnonymous(event.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 rounded border-white/20 bg-white/5 accent-blue-500"
        />

        <span>
          Contribute anonymously. Your name will not appear publicly.
        </span>
      </label>

      <button
        type="button"
        onClick={handleCheckout}
        disabled={isLoading}
        className="mt-5 w-full rounded-2xl bg-brand-500 px-6 py-4 font-semibold text-white shadow-lg shadow-brand-500/20 transition hover:-translate-y-0.5 hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading
          ? "Opening checkout..."
          : `Contribute $${amountInDollars || 0}`}
      </button>

      {message && (
        <p className="mt-3 text-center text-sm text-red-300">
          {message}
        </p>
      )}
    </div>
  );
}