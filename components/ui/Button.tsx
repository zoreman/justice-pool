import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "primary" | "secondary";
  size?: "sm" | "md" | "lg";
};

export default function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center rounded-xl font-semibold transition duration-200 focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-50";

  const variants = {
    primary:
      "bg-brand-500 text-white shadow-lg shadow-brand-500/20 hover:-translate-y-0.5 hover:bg-brand-400 hover:shadow-xl hover:shadow-brand-500/30 focus:ring-brand-500/25",
    secondary:
      "border border-slate-200 bg-white text-ink-950 shadow-sm hover:-translate-y-0.5 hover:border-brand-200 hover:bg-brand-50 focus:ring-brand-500/15",
  };

  const sizes = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-sm",
    lg: "px-8 py-4 text-base",
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}