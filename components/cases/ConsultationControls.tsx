"use client";

import { useFormStatus } from "react-dom";

type SimpleActionFormProps = {
  action: () => Promise<void>;
  label: string;
  pendingLabel: string;
  variant?: "primary" | "danger";
};

export function ConsultationActionForm({
  action,
  label,
  pendingLabel,
  variant = "primary",
}: SimpleActionFormProps) {
  return (
    <form action={action}>
      <ActionButton
        label={label}
        pendingLabel={pendingLabel}
        variant={variant}
      />
    </form>
  );
}

function ActionButton({
  label,
  pendingLabel,
  variant,
}: {
  label: string;
  pendingLabel: string;
  variant: "primary" | "danger";
}) {
  const { pending } = useFormStatus();

  const styles =
    variant === "danger"
      ? "border border-red-200 text-red-600 hover:bg-red-50"
      : "bg-brand-500 text-white hover:bg-brand-400";

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={`flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${styles}`}
    >
      {pending && (
        <span
          aria-hidden="true"
          className="h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current"
        />
      )}

      {pending ? pendingLabel : label}
    </button>
  );
}

 type RescheduleConsultationFormProps = {
  action: (formData: FormData) => Promise<void>;
  consultationId: string;
  durationMinutes: number;
  meetingType: string;
  locationOrLink: string | null;
  note: string | null;
};

export function RescheduleConsultationForm({
  action,
  consultationId,
  durationMinutes,
  meetingType,
  locationOrLink,
  note,
}: RescheduleConsultationFormProps) {
  return (
    <form
      action={action}
      className="mt-5 space-y-4"
    >
      <div>
        <label
          htmlFor={`consultation-date-${consultationId}`}
          className="text-sm font-medium text-slate-700"
        >
          New date and time
        </label>

        <input
          id={`consultation-date-${consultationId}`}
          type="datetime-local"
          name="scheduled_for"
          required
          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-ink-950 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10"
        />
      </div>

      <div>
        <label
          htmlFor={`consultation-duration-${consultationId}`}
          className="text-sm font-medium text-slate-700"
        >
          Duration
        </label>

        <select
          id={`consultation-duration-${consultationId}`}
          name="duration_minutes"
          defaultValue={String(durationMinutes)}
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
          htmlFor={`consultation-type-${consultationId}`}
          className="text-sm font-medium text-slate-700"
        >
          Meeting type
        </label>

        <select
          id={`consultation-type-${consultationId}`}
          name="meeting_type"
          defaultValue={meetingType}
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
          htmlFor={`consultation-location-${consultationId}`}
          className="text-sm font-medium text-slate-700"
        >
          Meeting link / location
        </label>

        <input
          id={`consultation-location-${consultationId}`}
          type="text"
          name="location_or_link"
          defaultValue={locationOrLink ?? ""}
          placeholder="Zoom link, phone instructions, or address"
          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-ink-950 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10"
        />
      </div>

      <div>
        <label
          htmlFor={`consultation-note-${consultationId}`}
          className="text-sm font-medium text-slate-700"
        >
          Note
        </label>

        <textarea
          id={`consultation-note-${consultationId}`}
          name="note"
          rows={3}
          defaultValue={note ?? ""}
          placeholder="Optional note for the claimant"
          className="mt-2 w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-ink-950 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10"
        />
      </div>

      <RescheduleButton />
    </form>
  );
}

function RescheduleButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending && (
        <span
          aria-hidden="true"
          className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
        />
      )}

      {pending
        ? "Sending new time..."
        : "Send new consultation time"}
    </button>
  );
}