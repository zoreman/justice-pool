import type { ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  hover?: boolean;
};

export default function Card({
  children,
  hover = true,
}: CardProps) {
  return (
    <div
      className={`
        rounded-3xl
        border
        border-slate-200
        bg-white
        p-8
        shadow-sm
        transition-all
        duration-300
        ${
          hover
            ? "hover:-translate-y-1 hover:shadow-xl"
            : ""
        }
      `}
    >
      {children}
    </div>
  );
}