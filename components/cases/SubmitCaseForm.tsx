"use client";

import {
  useActionState,
  useState,
} from "react";
import {
  useFormStatus,
} from "react-dom";
import { useRouter } from "next/navigation";

import {
  submitCase,
  type SubmitCaseState,
} from "@/app/submit-case/actions";

const initialState: SubmitCaseState = {
  error: null,
};

function SubmitButton() {
  const {
    pending,
  } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-2xl bg-brand-500 px-7 py-4 font-semibold transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending
        ? "Submitting Case..."
        : "Submit Case"}
    </button>
  );
}

export default function SubmitCaseForm() {
  const router =
    useRouter();

  const [
    state,
    formAction,
  ] = useActionState(
    submitCase,
    initialState,
  );

  const [
    summary,
    setSummary,
  ] = useState("");

  return (
    <form
      action={formAction}
      className="space-y-7"
    >
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
            defaultValue="Employment"
            className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-brand-400"
          >
            <option>
              Employment
            </option>

            <option>
              Housing
            </option>

            <option>
              Civil Rights
            </option>

            <option>
              Disability Discrimination
            </option>

            <option>
              Consumer Protection
            </option>

            <option>
              Education
            </option>

            <option>
              Immigration
            </option>

            <option>
              Other
            </option>
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
          onChange={(
            event,
          ) =>
            setSummary(
              event.target.value,
            )
          }
          placeholder="Give visitors a short overview of the case."
          required
          maxLength={350}
          rows={4}
          className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-brand-400"
        />

        <p className="mt-2 text-right text-xs text-slate-500">
          {summary.length}
          /350
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
          placeholder="Explain what happened, who was affected, and what legal support is needed."
          required
          rows={9}
          className="mt-2 w-full resize-y rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-brand-400"
        />
      </div>

      <div>
        <label
          htmlFor="days_left"
          className="text-sm font-medium text-slate-300"
        >
          Campaign Length
        </label>

        <div className="relative mt-2 max-w-xs">
          <input
            id="days_left"
            name="days_left"
            type="number"
            defaultValue="30"
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

      {state.error && (
        <p className="rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200">
          {state.error}
        </p>
      )}

      <div className="flex flex-col gap-3 border-t border-white/10 pt-7 sm:flex-row">
        <SubmitButton />

        <button
          type="button"
          onClick={() =>
            router.push(
              "/dashboard",
            )
          }
          className="rounded-2xl border border-white/10 px-7 py-4 font-semibold text-slate-300 transition hover:bg-white/5 hover:text-white"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}