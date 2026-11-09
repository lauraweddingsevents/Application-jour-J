import type { ComponentProps } from "react";

export function Selecteur({
  libelle,
  id,
  aide,
  children,
  ...props
}: ComponentProps<"select"> & { libelle: string; id: string; aide?: string }) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1.5 text-left">
      <span className="text-sm font-medium">{libelle}</span>
      <select
        id={id}
        className="min-h-[52px] rounded-2xl border border-or-clair bg-blanc px-4 text-base text-encre focus:border-or focus:outline-none"
        {...props}
      >
        {children}
      </select>
      {aide && <span className="text-sm text-encre-doux">{aide}</span>}
    </label>
  );
}
