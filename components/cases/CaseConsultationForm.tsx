"use client";

import { useFormStatus } from "react-dom";

type CaseConsultationFormProps = {
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
        ? "Sending proposal..."
        : "Propose consultation"}
    </button>
  );
}

export default function CaseConsultationForm({
  caseId,
  action,
}: CaseConsultationFormProps) {
  return (
    <form
      action={action.bind(null, caseId)}
      className="rounded-2xl border border-slate-200 bg-white p-6"
    >
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-600">
        Consultation
      </p>

      <h3 className="mt-3 text-xl font-semibold text-ink-950">
        Propose consultation
      </h3>

      <p className="mt-2 text-sm leading-6 text-slate-500">
        Choose a date, time, meeting format, and duration for the claimant.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="consultation-scheduled-for"
            className="text-sm font-medium text-slate-700"
          >
            Date and time
          </label>

          <input
            id="consultation-scheduled-for"
            type="datetime-local"
            name="scheduled_for"
            required
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-ink-950 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10"
          />
        </div>

        <div>
          <label
            htmlFor="consultation-duration"
            className="text-sm font-medium text-slate-700"
          >
            Duration
          </label>

          <select
            id="consultation-duration"
            name="duration_minutes"
            defaultValue="30"
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-ink-950 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10"
          >
            <option value="15">
              15 minutes
            </option>

            <option value="30">
              30 minutes
            </option>

            <option value="45">
              45 minutes
            </option>

            <option value="60">
              1 hour
            </option>

            <option value="90">
              1 hour 30 minutes
            </option>

            <option value="120">
              2 hours
            </option>
          </select>
        </div>

        <div>
          <label
            htmlFor="consultation-meeting-type"
            className="text-sm font-medium text-slate-700"
          >
            Meeting type
          </label>

          <select
            id="consultation-meeting-type"
            name="meeting_type"
            defaultValue="video"
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-ink-950 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10"
          >
            <option value="video">
              Video call
            </option>

            <option value="phone">
              Phone call
            </option>

            <option value="in_person">
              In person
            </option>
          </select>
        </div>

        <div>
          <label
            htmlFor="consultation-location"
            className="text-sm font-medium text-slate-700"
          >
            Meeting link / location
          </label>

          <input
            id="consultation-location"
            type="text"
            name="location_or_link"
            maxLength={1000}
            placeholder="Zoom link, phone instructions, or address"
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-ink-950 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10"
          />
        </div>
      </div>

      <div className="mt-4">
        <label
          htmlFor="consultation-note"
          className="text-sm font-medium text-slate-700"
        >
          Note
        </label>

        <textarea
          id="consultation-note"
          name="note"
          rows={4}
          maxLength={2000}
          placeholder="Anything the claimant should know before the consultation..."
          className="mt-2 w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-ink-950 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10"
        />

        <p className="mt-2 text-xs text-slate-400">
          Include any preparation instructions or information the claimant should have ready.
        </p>
      </div>

      <SubmitButton />
    </form>
  );
}