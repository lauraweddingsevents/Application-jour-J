import type { ComponentProps } from "react";

export function ZoneTexte({
  libelle,
  id,
  ...props
}: ComponentProps<"textarea"> & { libelle: string; id: string }) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1.5 text-left">
      <span className="text-sm font-medium">{libelle}</span>
      <textarea
        id={id}
        rows={3}
        className="rounded-2xl border border-or-clair bg-blanc px-4 py-3 text-base text-encre placeholder:text-encre-doux/60 focus:border-or focus:outline-none"
        {...props}
      />
    </label>
  );
}
