"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase-browser";

type SubmitCaseFormProps = {
  userId: string;
};

function createSlug(title: string) {
  const cleanedTitle = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

  return `${cleanedTitle}-${Date.now()}`;
}

export default function SubmitCaseForm({
  userId,
}: SubmitCaseFormProps) {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Employment");
  const [goal, setGoal] = useState("");
  const [summary, setSummary] = useState("");
  const [story, setStory] = useState("");
  const [daysLeft, setDaysLeft] = useState("30");

  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");
    setIsSubmitting(true);

    const fundingGoal = Number(goal);
    const deadlineDays = Number(daysLeft);

    if (!Number.isFinite(fundingGoal) || fundingGoal <= 0) {
      setMessage("Enter a valid funding goal.");
      setIsSubmitting(false);
      return;
    }

    if (!Number.isInteger(deadlineDays) || deadlineDays <= 0) {
      setMessage("Enter a valid number of days.");
      setIsSubmitting(false);
      return;
    }

    const caseId = createSlug(title);

     const { error } = await supabase.from("cases").insert({
  id: caseId,
  user_id: userId,
  title: title.trim(),
  description: summary.trim(),
  category,
  goal: fundingGoal,
  raised: 0,
  summary: summary.trim(),
  story: story.trim(),
  days_left: deadlineDays,
  status: "pending",
});

    if (error) {
      setMessage(error.message);
      setIsSubmitting(false);
      return;
    }

    router.push(`/cases/${caseId}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-7">
      <div>
        <label
          htmlFor="title"
          className="text-sm font-medium text-slate-300"
        >
          Case Title
        </label>

        <input
          id="title"
          name="title"
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Example: Wrongful termination after reporting misconduct"
          required
          maxLength={120}
          className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-brand-400"
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label
            htmlFor="category"
            className="text-sm font-medium text-slate-300"
          >
            Category
          </label>

          <select
            id="category"
            name="category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-brand-400"
          >
            <option>Employment</option>
            <option>Housing</option>
            <option>Civil Rights</option>
            <option>Disability Discrimination</option>
            <option>Consumer Protection</option>
            <option>Education</option>
            <option>Immigration</option>
            <option>Other</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="goal"
            className="text-sm font-medium text-slate-300"
          >
            Funding Goal
          </label>

          <div className="relative mt-2">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
              $
            </span>

            <input
              id="goal"
              name="goal"
              type="number"
              value={goal}
              onChange={(event) => setGoal(event.target.value)}
              placeholder="10000"
              min="1"
              step="1"
              required
              className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-8 pr-4 text-white outline-none transition placeholder:text-slate-600 focus:border-brand-400"
            />
          </div>
        </div>
      </div>

      <div>
        <label
          htmlFor="summary"
          className="text-sm font-medium text-slate-300"
        >
          Short Summary
        </label>

        <textarea
          id="summary"
          name="summary"
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
          placeholder="Give visitors a short overview of the case."
          required
          maxLength={350}
          rows={4}
          className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-brand-400"
        />

        <p className="mt-2 text-right text-xs text-slate-500">
          {summary.length}/350
        </p>
      </div>

      <div>
        <label
          htmlFor="story"
          className="text-sm font-medium text-slate-300"
        >
          Full Story
        </label>

        <textarea
          id="story"
          name="story"
          value={story}
          onChange={(event) => setStory(event.target.value)}
          placeholder="Explain what happened, who was affected, and what legal support is needed."
          required
          rows={9}
          className="mt-2 w-full resize-y rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-brand-400"
        />
      </div>

      <div>
        <label
          htmlFor="daysLeft"
          className="text-sm font-medium text-slate-300"
        >
          Campaign Length
        </label>

        <div className="relative mt-2 max-w-xs">
          <input
            id="daysLeft"
            name="daysLeft"
            type="number"
            value={daysLeft}
            onChange={(event) => setDaysLeft(event.target.value)}
            min="1"
            max="365"
            required
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 pr-16 text-white outline-none transition focus:border-brand-400"
          />

          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-500">
            days
          </span>
        </div>
      </div>

      {message && (
        <p className="rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200">
          {message}
        </p>
      )}

      <div className="flex flex-col gap-3 border-t border-white/10 pt-7 sm:flex-row">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-2xl bg-brand-500 px-7 py-4 font-semibold transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Submitting Case..." : "Submit Case"}
        </button>

        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          disabled={isSubmitting}
          className="rounded-2xl border border-white/10 px-7 py-4 font-semibold text-slate-300 transition hover:bg-white/5 hover:text-white disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}