"use client";

import { useFormStatus } from "react-dom";

type CaseDocumentRequestFormProps = {
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
      className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending && (
        <span
          aria-hidden="true"
          className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
        />
      )}

      {pending ? "Sending request..." : "Send request"}
    </button>
  );
}

export default function CaseDocumentRequestForm({
  caseId,
  action,
}: CaseDocumentRequestFormProps) {
  return (
    <form
      action={action.bind(null, caseId)}
      className="rounded-2xl border border-slate-200 bg-white p-6"
    >
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-600">
        Document request
      </p>

      <h3 className="mt-3 text-xl font-semibold text-ink-950">
        Request a document
      </h3>

      <p className="mt-2 text-sm leading-6 text-slate-500">
        Ask the claimant to upload a specific document for this case.
      </p>

      <label
        htmlFor="document-request-category"
        className="mt-5 block text-sm font-medium text-slate-700"
      >
        Document type
      </label>

      <select
        id="document-request-category"
        name="category"
        required
        defaultValue="evidence"
        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-ink-950 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10"
      >
        <option value="evidence">
          Evidence
        </option>

        <option value="lease_contract">
          Lease / Contract
        </option>

        <option value="court_filing">
          Court filing
        </option>

        <option value="correspondence">
          Correspondence
        </option>

        <option value="identification">
          Identification
        </option>

        <option value="other">
          Other
        </option>
      </select>

      <label
        htmlFor="document-request-note"
        className="mt-4 block text-sm font-medium text-slate-700"
      >
        Instructions
      </label>

      <textarea
        id="document-request-note"
        name="note"
        rows={4}
        required
        maxLength={2000}
        placeholder="Explain what you need, e.g. Upload the signed lease covering January 2025 through December 2025."
        className="mt-2 w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-ink-950 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10"
      />

      <p className="mt-2 text-xs text-slate-400">
        Be specific about which document or information you need.
      </p>

      <SubmitButton />
    </form>
  );
}