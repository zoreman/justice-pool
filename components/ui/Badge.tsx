import type { ReactNode } from "react";

type BadgeProps = {
  children: ReactNode;
};

export default function Badge({ children }: BadgeProps) {
  return (
    <span className="inline-flex items-center rounded-full border border-brand-400/25 bg-brand-400/10 px-4 py-2 text-sm font-medium text-brand-300 backdrop-blur">
      <span className="mr-2 h-1.5 w-1.5 rounded-full bg-accent-400 shadow-[0_0_12px_rgba(55,212,199,0.8)]" />
      {children}
    </span>
  );
}