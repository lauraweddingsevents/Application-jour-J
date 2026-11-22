import type { ComponentProps } from "react";

// Liste déroulante avec son libellé, grande et lisible sur téléphone
export function Liste({
  libelle,
  id,
  className = "",
  children,
  ...props
}: ComponentProps<"select"> & { libelle: string; id: string }) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1.5 text-left">
      <span className="text-sm font-medium">{libelle}</span>
      <select
        id={id}
        className={`min-h-[52px] appearance-none rounded-2xl border border-or-clair bg-blanc bg-[length:12px] bg-[right_1rem_center] bg-no-repeat px-4 pr-10 text-base text-encre focus:border-or focus:outline-none ${className}`}
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%2386684b' stroke-width='1.6' fill='none'/%3E%3C/svg%3E\")" }}
        {...props}
      >
        {children}
      </select>
    </label>
  );
}
