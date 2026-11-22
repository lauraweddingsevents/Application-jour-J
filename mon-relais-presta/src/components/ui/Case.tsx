import type { ReactNode } from "react";

// Case à cocher large, facile à toucher
export function Case({
  coche,
  onChange,
  children,
  id,
}: {
  coche: boolean;
  onChange: (v: boolean) => void;
  children: ReactNode;
  id: string;
}) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3 rounded-2xl bg-creme-fonce/60 p-4">
      <input
        id={id}
        type="checkbox"
        className="mt-0.5 size-6 shrink-0 accent-or"
        checked={coche}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="leading-snug">{children}</span>
    </label>
  );
}
