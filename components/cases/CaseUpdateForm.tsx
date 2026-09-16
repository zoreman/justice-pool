"use client";

import { useFormStatus } from "react-dom";

type CaseUpdateFormProps = {
  caseId: string;
  action: (
    caseId: string,
    formData: FormData,
  ) => Promise<void>;
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending && (
        <span
          aria-hidden="true"
          className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
        />
      )}

      {pending
        ? "Publishing..."
        : "Publish update"}
    </button>
  );
}

export default function CaseUpdateForm({
  caseId,
  action,
}: CaseUpdateFormProps) {
  return (
    <form
      action={action.bind(null, caseId)}
      className="border-t border-slate-200 pt-10"
    >
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">
        Case owner
      </p>

      <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-ink-950">
        Post an update
      </h2>

      <p className="mt-3 max-w-2xl text-slate-600">
        Share progress, legal developments, or important
        campaign news.
      </p>

      <div className="mt-8">
        <label
          htmlFor="update-title"
          className="text-sm font-medium text-slate-700"
        >
          Update title
        </label>

        <input
          id="update-title"
          name="title"
          type="text"
          required
          maxLength={120}
          placeholder="Example: Attorney consultation completed"
          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-ink-950 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10"
        />

        <p className="mt-2 text-xs text-slate-400">
          Maximum 120 characters.
        </p>
      </div>

      <div className="mt-6">
        <label
          htmlFor="update-content"
          className="text-sm font-medium text-slate-700"
        >
          Update details
        </label>

        <textarea
          id="update-content"
          name="content"
          required
          rows={6}
          placeholder="Explain what changed and what happens next."
          className="mt-2 w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 leading-7 text-ink-950 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10"
        />
      </div>

      <SubmitButton />
    </form>
  );
}