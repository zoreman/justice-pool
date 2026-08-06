type CommentFormProps = {
  caseId: string;
  action: (caseId: string, formData: FormData) => Promise<void>;
};

export default function CommentForm({
  caseId,
  action,
}: CommentFormProps) {
  return (
    <form action={action.bind(null, caseId)} className="mt-8">
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
        className="mt-3 w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 leading-7 text-ink-950 outline-none transition placeholder:text-slate-400 focus:border-brand-500"
      />

      <button
        type="submit"
        className="mt-4 rounded-xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-400"
      >
        Post comment
      </button>
    </form>
  );
}