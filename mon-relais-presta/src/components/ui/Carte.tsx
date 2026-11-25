import type { ComponentProps } from "react";

export function Carte({ className = "", ...props }: ComponentProps<"div">) {
  return (
    <div
      className={`rounded-carte bg-blanc p-5 shadow-[0_1px_3px_rgba(59,51,48,0.08)] ring-1 ring-or-clair/40 ${className}`}
      {...props}
    />
  );
}
