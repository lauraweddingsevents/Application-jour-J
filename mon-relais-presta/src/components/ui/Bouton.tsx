import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variante = "principal" | "secondaire" | "discret" | "danger";

const styles: Record<Variante, string> = {
  principal:
    "bg-or text-blanc shadow-sm hover:bg-or-fonce active:bg-or-fonce",
  secondaire:
    "bg-blanc text-encre border border-or-clair hover:border-or active:bg-creme-fonce",
  discret: "bg-transparent text-or-fonce underline-offset-4 hover:underline",
  danger: "bg-alerte text-blanc hover:opacity-90",
};

// Gros boutons faciles à toucher (au moins 52 px de haut)
const base =
  "inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full px-6 text-base font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none";

export function Bouton({
  variante = "principal",
  className = "",
  ...props
}: ComponentProps<"button"> & { variante?: Variante }) {
  return (
    <button
      className={`${base} ${styles[variante]} ${className}`}
      {...props}
    />
  );
}

export function BoutonLien({
  href,
  variante = "principal",
  className = "",
  children,
}: {
  href: string;
  variante?: Variante;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={`${base} ${styles[variante]} ${className}`}>
      {children}
    </Link>
  );
}
