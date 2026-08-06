"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase-browser";

type EditCaseFormProps = {
  caseData: {
    id: string;
    title: string;
    category: string;
    goal: number;
    summary: string | null;
    story: string | null;
    days_left: number;
  };
};

export default function EditCaseForm({ caseData }: EditCaseFormProps) {
  const router = useRouter();

  const [title, setTitle] = useState(caseData.title);
  const [category, setCategory] = useState(caseData.category);
  const [goal, setGoal] = useState(String(caseData.goal));
  const [summary, setSummary] = useState(caseData.summary ?? "");
  const [story, setStory] = useState(caseData.story ?? "");
  const [daysLeft, setDaysLeft] = useState(String(caseData.days_left));

  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");
    setIsSaving(true);

    const fundingGoal = Number(goal);
    const campaignDays = Number(daysLeft);

    if (!Number.isFinite(fundingGoal) || fundingGoal <= 0) {
      setMessage("Enter a valid funding goal.");
      setIsSaving(false);
      return;
    }

    if (!Number.isInteger(campaignDays) || campaignDays <= 0) {
      setMessage("Enter a valid campaign length.");
      setIsSaving(false);
      return;
    }

    const { error } = await supabase
      .from("cases")
      .update({
        title: title.trim(),
        category,
        goal: fundingGoal,
        description: summary.trim(),
        summary: summary.trim(),
        story: story.trim(),
        days_left: campaignDays,
        status: "pending",
        verified: false,
        review_notes: null,
      })
      .eq("id", caseData.id);

    if (error) {
      setMessage(error.message);
      setIsSaving(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-7">
      <div>
        <label htmlFor="title" className="text-sm font-medium text-slate-300">
          Case title
        </label>

        <input
          id="title"
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
          maxLength={120}
          className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none transition focus:border-brand-400"
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
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none transition focus:border-brand-400"
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
          <label htmlFor="goal" className="text-sm font-medium text-slate-300">
            Funding goal
          </label>

          <input
            id="goal"
            type="number"
            value={goal}
            onChange={(event) => setGoal(event.target.value)}
            min="1"
            required
            className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none transition focus:border-brand-400"
          />
        </div>
      </div>

      <div>
        <label htmlFor="summary" className="text-sm font-medium text-slate-300">
          Short summary
        </label>

        <textarea
          id="summary"
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
          required
          maxLength={350}
          rows={4}
          className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none transition focus:border-brand-400"
        />

        <p className="mt-2 text-right text-xs text-slate-500">
          {summary.length}/350
        </p>
      </div>

      <div>
        <label htmlFor="story" className="text-sm font-medium text-slate-300">
          Full story
        </label>

        <textarea
          id="story"
          value={story}
          onChange={(event) => setStory(event.target.value)}
          required
          rows={10}
          className="mt-2 w-full resize-y rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none transition focus:border-brand-400"
        />
      </div>

      <div>
        <label
          htmlFor="daysLeft"
          className="text-sm font-medium text-slate-300"
        >
          Campaign length
        </label>

        <input
          id="daysLeft"
          type="number"
          value={daysLeft}
          onChange={(event) => setDaysLeft(event.target.value)}
          min="1"
          max="365"
          required
          className="mt-2 w-full max-w-xs rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none transition focus:border-brand-400"
        />
      </div>

      {message && (
        <p className="rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200">
          {message}
        </p>
      )}

      <div className="flex flex-col gap-3 border-t border-white/10 pt-7 sm:flex-row">
        <button
          type="submit"
          disabled={isSaving}
          className="rounded-xl bg-brand-500 px-6 py-3 font-semibold transition hover:bg-brand-400 disabled:opacity-60"
        >
          {isSaving ? "Resubmitting..." : "Save and resubmit"}
        </button>

        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          disabled={isSaving}
          className="rounded-xl border border-white/10 px-6 py-3 font-semibold text-slate-300 transition hover:bg-white/5"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}