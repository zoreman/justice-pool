"use client";

import {
  FormEvent,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";

import { resubmitCase } from "@/app/cases/[id]/edit/actions";

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

export default function EditCaseForm({
  caseData,
}: EditCaseFormProps) {
  const router = useRouter();

  const [isPending, startTransition] =
    useTransition();

  const [title, setTitle] =
    useState(caseData.title);

  const [category, setCategory] =
    useState(caseData.category);

  const [goal, setGoal] =
    useState(String(caseData.goal));

  const [summary, setSummary] =
    useState(caseData.summary ?? "");

  const [story, setStory] =
    useState(caseData.story ?? "");

  const [daysLeft, setDaysLeft] =
    useState(String(caseData.days_left));

  const [message, setMessage] =
    useState("");

  function clearMessage() {
    if (message) {
      setMessage("");
    }
  }

  function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (isPending) {
      return;
    }

    setMessage("");

    const form = event.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      try {
        await resubmitCase(
          caseData.id,
          formData,
        );
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "Unable to resubmit case.",
        );
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-busy={isPending}
      className="space-y-7"
    >
      <div>
        <label
          htmlFor="title"
          className="text-sm font-medium text-slate-300"
        >
          Case title
        </label>

        <input
          id="title"
          name="title"
          type="text"
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            clearMessage();
          }}
          required
          maxLength={120}
          disabled={isPending}
          className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-400/10 disabled:cursor-not-allowed disabled:opacity-60"
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
            onChange={(event) => {
              setCategory(event.target.value);
              clearMessage();
            }}
            disabled={isPending}
            className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-400/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="Employment">
              Employment
            </option>

            <option value="Housing">
              Housing
            </option>

            <option value="Civil Rights">
              Civil Rights
            </option>

            <option value="Disability Discrimination">
              Disability Discrimination
            </option>

            <option value="Consumer Protection">
              Consumer Protection
            </option>

            <option value="Education">
              Education
            </option>

            <option value="Immigration">
              Immigration
            </option>

            <option value="Other">
              Other
            </option>
          </select>
        </div>

        <div>
          <label
            htmlFor="goal"
            className="text-sm font-medium text-slate-300"
          >
            Funding goal
          </label>

          <input
            id="goal"
            name="goal"
            type="number"
            value={goal}
            onChange={(event) => {
              setGoal(event.target.value);
              clearMessage();
            }}
            min="1"
            required
            disabled={isPending}
            className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-400/10 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="summary"
          className="text-sm font-medium text-slate-300"
        >
          Short summary
        </label>

        <textarea
          id="summary"
          name="summary"
          value={summary}
          onChange={(event) => {
            setSummary(event.target.value);
            clearMessage();
          }}
          required
          maxLength={350}
          rows={4}
          disabled={isPending}
          className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-400/10 disabled:cursor-not-allowed disabled:opacity-60"
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
          Full story
        </label>

        <textarea
          id="story"
          name="story"
          value={story}
          onChange={(event) => {
            setStory(event.target.value);
            clearMessage();
          }}
          required
          rows={10}
          disabled={isPending}
          className="mt-2 w-full resize-y rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-400/10 disabled:cursor-not-allowed disabled:opacity-60"
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
          name="days_left"
          type="number"
          value={daysLeft}
          onChange={(event) => {
            setDaysLeft(event.target.value);
            clearMessage();
          }}
          min="1"
          max="365"
          required
          disabled={isPending}
          className="mt-2 w-full max-w-xs rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-400/10 disabled:cursor-not-allowed disabled:opacity-60"
        />
      </div>

      {message && (
        <p
          role="alert"
          className="rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200"
        >
          {message}
        </p>
      )}

      <div className="flex flex-col gap-3 border-t border-white/10 pt-7 sm:flex-row">
        <button
          type="submit"
          disabled={isPending}
          aria-busy={isPending}
          className="flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-6 py-3 font-semibold transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending && (
            <span
              aria-hidden="true"
              className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
            />
          )}

          {isPending
            ? "Resubmitting..."
            : "Save and resubmit"}
        </button>

        <button
          type="button"
          onClick={() =>
            router.push("/dashboard")
          }
          disabled={isPending}
          className="rounded-xl border border-white/10 px-6 py-3 font-semibold text-slate-300 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}