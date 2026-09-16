"use client";

import { useFormStatus } from "react-dom";

type CommentFormProps = {
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
      className="flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending && (
        <span
          aria-hidden="true"
          className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
        />
      )}

      {pending ? "Posting..." : "Post comment"}
    </button>
  );
}

export default function CommentForm({
  caseId,
  action,
}: CommentFormProps) {
  return (
    <form
      action={action.bind(null, caseId)}
      className="mt-8"
    >
      <label
        htmlFor="comment"
        className="block text-sm font-medium text-slate-700"
      >
        Add a comment
      </label>

      <textarea
        id="comment"
        name="content"
        required
        maxLength={1000}
        rows={4}
        placeholder="Write a respectful comment..."
        className="mt-3 w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 leading-7 text-ink-950 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10"
      />

      <div className="mt-2 flex items-center justify-between gap-4">
        <p className="text-xs text-slate-400">
          Keep the discussion respectful and relevant to the case.
        </p>

        <p className="shrink-0 text-xs text-slate-400">
          Max 1,000 characters
        </p>
      </div>

      <div className="mt-4">
        <SubmitButton />
      </div>
    </form>
  );
}