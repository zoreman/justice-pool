"use client";

import { useFormStatus } from "react-dom";

type CaseStatusFormProps = {
  caseId: string;
  currentStatus: string;
  isCaseOwner: boolean;
  isAssignedAttorney: boolean;
  action: (
    caseId: string,
    formData: FormData,
  ) => Promise<void>;
};

type StatusOption = {
  value: string;
  label: string;
};

const statusLabels: Record<string, string> = {
  submitted: "Submitted",
  under_review: "Under review",
  approved: "Approved",
  attorney_assigned: "Attorney assigned",
  consultation_scheduled: "Consultation scheduled",
  documents_requested: "Documents requested",
  filing_prepared: "Filing prepared",
  filed: "Filed",
  negotiation: "Negotiation",
  hearing: "Hearing",
  resolved: "Resolved",
  closed: "Closed",
};

const workflow: Record<string, string[]> = {
  submitted: ["under_review"],
  under_review: ["approved"],
  approved: ["attorney_assigned"],
  attorney_assigned: ["consultation_scheduled"],
  consultation_scheduled: [
    "documents_requested",
    "filing_prepared",
  ],
  documents_requested: ["filing_prepared"],
  filing_prepared: ["filed"],
  filed: ["negotiation", "hearing"],
  negotiation: ["hearing", "resolved"],
  hearing: ["resolved"],
  resolved: ["closed"],
  closed: [],
};

function formatStatus(status: string) {
  return (
    statusLabels[status] ??
    status
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase(),
      )
  );
}

function getAvailableStatuses({
  currentStatus,
  isCaseOwner,
  isAssignedAttorney,
}: {
  currentStatus: string;
  isCaseOwner: boolean;
  isAssignedAttorney: boolean;
}): StatusOption[] {
  const nextStatuses =
    workflow[currentStatus] ?? [];

  if (isCaseOwner) {
    if (currentStatus === "resolved") {
      return [
        {
          value: "closed",
          label: "Closed",
        },
      ];
    }

    return [];
  }

  if (isAssignedAttorney) {
    const attorneyControlledStatuses =
      new Set([
        "consultation_scheduled",
        "documents_requested",
        "filing_prepared",
        "filed",
        "negotiation",
        "hearing",
        "resolved",
        "closed",
      ]);

    return nextStatuses
      .filter((status) =>
        attorneyControlledStatuses.has(status),
      )
      .map((status) => ({
        value: status,
        label: formatStatus(status),
      }));
  }

  return [];
}

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

      {pending
        ? "Updating status..."
        : "Update status"}
    </button>
  );
}

export default function CaseStatusForm({
  caseId,
  currentStatus,
  isCaseOwner,
  isAssignedAttorney,
  action,
}: CaseStatusFormProps) {
  const normalizedStatus =
    currentStatus?.trim().toLowerCase() ||
    "submitted";

  const availableStatuses =
    getAvailableStatuses({
      currentStatus: normalizedStatus,
      isCaseOwner,
      isAssignedAttorney,
    });

  const currentStatusLabel =
    formatStatus(normalizedStatus);

  if (availableStatuses.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-600">
          Case progress
        </p>

        <h3 className="mt-3 text-xl font-semibold text-ink-950">
          Current status
        </h3>

        <div className="mt-5 rounded-xl bg-slate-50 px-4 py-4">
          <p className="font-semibold text-ink-950">
            {currentStatusLabel}
          </p>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            {normalizedStatus === "closed"
              ? "This case has been closed."
              : isCaseOwner
                ? "The case will advance as it is reviewed and handled by the assigned legal team."
                : "There are no workflow changes available from this stage."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <form
      action={action.bind(null, caseId)}
      className="rounded-2xl border border-slate-200 bg-white p-6"
    >
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-600">
        Case progress
      </p>

      <h3 className="mt-3 text-xl font-semibold text-ink-950">
        Update case status
      </h3>

      <div className="mt-5 rounded-xl bg-slate-50 px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
          Current status
        </p>

        <p className="mt-2 font-semibold text-ink-950">
          {currentStatusLabel}
        </p>
      </div>

      <label
        htmlFor={`case-status-${caseId}`}
        className="mt-5 block text-sm font-semibold text-ink-950"
      >
        Move case to
      </label>

      <select
        id={`case-status-${caseId}`}
        name="status"
        required
        defaultValue=""
        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-ink-950 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10"
      >
        <option
          value=""
          disabled
        >
          Select next status
        </option>

        {availableStatuses.map((status) => (
          <option
            key={status.value}
            value={status.value}
          >
            {status.label}
          </option>
        ))}
      </select>

      <label
        htmlFor={`case-status-note-${caseId}`}
        className="mt-5 block text-sm font-semibold text-ink-950"
      >
        Update note
      </label>

      <textarea
        id={`case-status-note-${caseId}`}
        name="note"
        rows={4}
        maxLength={2000}
        placeholder="Explain what changed or what happens next..."
        className="mt-2 w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-ink-950 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10"
      />

      <div className="mt-2 flex items-center justify-between gap-4">
        <p className="text-xs text-slate-400">
          This update will appear in the case workflow.
        </p>

        <p className="shrink-0 text-xs text-slate-400">
          Max 2,000 characters
        </p>
      </div>

      <SubmitButton />
    </form>
  );
}