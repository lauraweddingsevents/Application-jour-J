import type { ComponentProps } from "react";

// Champ de saisie avec son libellé, grand et lisible sur téléphone
export function Champ({
  libelle,
  aide,
  id,
  className = "",
  ...props
}: ComponentProps<"input"> & { libelle: string; aide?: string; id: string }) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1.5 text-left">
      <span className="text-sm font-medium">{libelle}</span>
      <input
        id={id}
        className={`min-h-[52px] rounded-2xl border border-or-clair bg-blanc px-4 text-base text-encre placeholder:text-encre-doux/60 focus:border-or focus:outline-none ${className}`}
        {...props}
      />
      {aide && <span className="text-sm text-encre-doux">{aide}</span>}
    </label>
  );
}
