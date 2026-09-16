"use client";

import { useFormStatus } from "react-dom";

type CaseActionButtonProps = {
  label: string;
  pendingLabel: string;
  variant?: "primary" | "secondary" | "danger" | "textDanger";
  fullWidth?: boolean;
};

export default function CaseActionButton({
  label,
  pendingLabel,
  variant = "primary",
  fullWidth = false,
}: CaseActionButtonProps) {
  const { pending } = useFormStatus();

  const variantClasses = {
    primary:
      "bg-brand-500 text-white hover:bg-brand-400",
    secondary:
      "border border-slate-300 bg-white text-ink-950 hover:border-brand-500 hover:text-brand-600",
    danger:
      "border border-red-200 bg-white text-red-600 hover:bg-red-50",
    textDanger:
      "text-red-600 hover:text-red-500",
  };

  const sizeClasses =
    variant === "textDanger"
      ? "text-sm font-medium"
      : "rounded-xl px-5 py-3 text-sm font-semibold";

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={`flex items-center justify-center gap-2 transition disabled:cursor-not-allowed disabled:opacity-60 ${
        fullWidth ? "w-full" : ""
      } ${sizeClasses} ${variantClasses[variant]}`}
    >
      {pending && (
        <span
          aria-hidden="true"
          className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current/30 border-t-current"
        />
      )}

      {pending ? pendingLabel : label}
    </button>
  );
}