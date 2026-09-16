"use client";

import { useFormStatus } from "react-dom";

type CaseResolutionFormProps = {
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
      className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending && (
        <span
          aria-hidden="true"
          className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
        />
      )}

      {pending
        ? "Recording resolution..."
        : "Mark case resolved"}
    </button>
  );
}

export default function CaseResolutionForm({
  caseId,
  action,
}: CaseResolutionFormProps) {
  return (
    <form
      action={action.bind(
        null,
        caseId,
      )}
      className="rounded-2xl border border-slate-200 bg-white p-6"
    >
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-600">
        Case resolution
      </p>

      <h3 className="mt-3 text-xl font-semibold text-ink-950">
        Record case outcome
      </h3>

      <p className="mt-2 text-sm leading-6 text-slate-500">
        Record how the matter was resolved before closing the case.
      </p>

      <label
        htmlFor="case-resolution-outcome"
        className="mt-5 block text-sm font-medium text-slate-700"
      >
        Resolution
      </label>

      <select
        id="case-resolution-outcome"
        name="outcome"
        required
        defaultValue=""
        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-ink-950 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10"
      >
        <option
          value=""
          disabled
        >
          Select outcome
        </option>

        <option value="settled">
          Settled
        </option>

        <option value="won">
          Won
        </option>

        <option value="dismissed">
          Dismissed
        </option>

        <option value="withdrawn">
          Withdrawn
        </option>

        <option value="other">
          Other resolution
        </option>
      </select>

      <label
        htmlFor="case-resolution-note"
        className="mt-5 block text-sm font-medium text-slate-700"
      >
        Resolution details
      </label>

      <textarea
        id="case-resolution-note"
        name="note"
        rows={5}
        required
        maxLength={3000}
        placeholder="Describe the resolution, settlement, ruling, or other outcome..."
        className="mt-2 w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-ink-950 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10"
      />

      <div className="mt-2 flex items-center justify-between gap-4">
        <p className="text-xs text-slate-400">
          Include the important details of the final outcome.
        </p>

        <p className="shrink-0 text-xs text-slate-400">
          Max 3,000 characters
        </p>
      </div>

      <SubmitButton />
    </form>
  );
}