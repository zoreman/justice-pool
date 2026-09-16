"use client";

import { useFormStatus } from "react-dom";

type CaseClosureFormProps = {
  caseId: string;
  isCaseOwner: boolean;
  isAssignedAttorney: boolean;
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
      className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-ink-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending && (
        <span
          aria-hidden="true"
          className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
        />
      )}

      {pending
        ? "Closing case..."
        : "Close case"}
    </button>
  );
}

export default function CaseClosureForm({
  caseId,
  isCaseOwner,
  isAssignedAttorney,
  action,
}: CaseClosureFormProps) {
  return (
    <form
      action={action.bind(
        null,
        caseId,
      )}
      className="rounded-2xl border border-slate-200 bg-white p-6"
    >
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-600">
        Case closure
      </p>

      <h3 className="mt-3 text-xl font-semibold text-ink-950">
        Close this case
      </h3>

      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
        The case has been resolved. Closing it marks the legal matter
        as complete and ends the active case workflow.
      </p>

      <div className="mt-5 rounded-xl bg-slate-50 p-4">
        <p className="text-sm leading-6 text-slate-600">
          {isCaseOwner
            ? "As the claimant, you can confirm that this resolved case is complete."
            : isAssignedAttorney
              ? "As the assigned attorney, you can close this resolved matter."
              : "This case can now be closed."}
        </p>
      </div>

      <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-semibold text-amber-800">
          Closing this case ends the active workflow.
        </p>

        <p className="mt-1 text-sm leading-6 text-amber-700">
          Make sure the resolution and final case information are complete
          before continuing.
        </p>
      </div>

      <label
        htmlFor="case-closure-note"
        className="mt-5 block text-sm font-medium text-slate-700"
      >
        Final note
      </label>

      <textarea
        id="case-closure-note"
        name="note"
        rows={4}
        maxLength={2000}
        placeholder="Optional final note about the case..."
        className="mt-2 w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-ink-950 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10"
      />

      <div className="mt-2 flex items-center justify-between gap-4">
        <p className="text-xs text-slate-400">
          This note will be recorded with the case closure.
        </p>

        <p className="shrink-0 text-xs text-slate-400">
          Max 2,000 characters
        </p>
      </div>

      <SubmitButton />
    </form>
  );
}