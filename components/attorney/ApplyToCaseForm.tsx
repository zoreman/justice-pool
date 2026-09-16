"use client";

import { useFormStatus } from "react-dom";

type ApplyToCaseFormProps = {
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
      className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-6 py-3 font-semibold text-white transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending && (
        <span
          aria-hidden="true"
          className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
        />
      )}

      {pending
        ? "Submitting application..."
        : "Submit application"}
    </button>
  );
}

export default function ApplyToCaseForm({
  caseId,
  action,
}: ApplyToCaseFormProps) {
  return (
    <form
      action={action.bind(null, caseId)}
      className="mt-6"
    >
      <label
        htmlFor="cover_letter"
        className="block text-sm font-medium text-slate-300"
      >
        Cover letter
      </label>

      <textarea
        id="cover_letter"
        name="cover_letter"
        required
        minLength={100}
        maxLength={3000}
        rows={10}
        placeholder="Explain your relevant experience, why you are interested in the case, and how you would approach representation."
        className="mt-3 w-full resize-y rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 leading-7 text-white outline-none transition placeholder:text-slate-600 focus:border-brand-400 focus:ring-2 focus:ring-brand-400/10"
      />

      <div className="mt-2 flex items-center justify-between gap-4">
        <p className="text-sm text-slate-500">
          Minimum 100 characters.
        </p>

        <p className="text-xs text-slate-600">
          Maximum 3,000 characters.
        </p>
      </div>

      <SubmitButton />
    </form>
  );
}