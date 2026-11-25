"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Logo } from "@/components/Logo";
import { Garde } from "@/components/Garde";
import { useMembre } from "@/lib/membre";

// Petites icônes au trait fin
const trait = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
const ICONES: Record<string, ReactNode> = {
  demandes: <svg viewBox="0 0 24 24" className="size-6" {...trait}><path d="M4 6h16M4 12h16M4 18h10" /></svg>,
  deposer: <svg viewBox="0 0 24 24" className="size-6" {...trait} strokeWidth={2}><path d="M12 5v14M5 12h14" /></svg>,
  suivis: <svg viewBox="0 0 24 24" className="size-6" {...trait}><path d="M4 12l5 5L20 6" /></svg>,
  profil: <svg viewBox="0 0 24 24" className="size-6" {...trait}><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></svg>,
};

const ONGLETS = [
  { href: "/demandes", texte: "Demandes", icone: ICONES.demandes },
  { href: "/deposer", texte: "Déposer", icone: ICONES.deposer },
  { href: "/mes-demandes", texte: "Mes suivis", icone: ICONES.suivis },
  { href: "/profil", texte: "Profil", icone: ICONES.profil },
];

// Cadre des pages membres : en-tête, contenu, barre d'onglets en bas (pouce)
export function Coquille({ children, admin = false }: { children: ReactNode; admin?: boolean }) {
  return (
    <Garde admin={admin}>
      <EnTete />
      <main className="mx-auto w-full max-w-xl flex-1 px-4 pb-28 pt-4">{children}</main>
      <Onglets />
    </Garde>
  );
}

function EnTete() {
  const { membre } = useMembre();
  return (
    <header className="sticky top-0 z-20 border-b border-or-clair/50 bg-creme/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-xl items-center justify-between px-4">
        <Link href="/demandes" aria-label="Accueil"><Logo /></Link>
        {membre?.role === "admin" && (
          <Link href="/admin" className="rounded-full border border-or-clair bg-blanc px-3 py-1.5 text-sm text-or-fonce">
            Administration
          </Link>
        )}
      </div>
    </header>
  );
}

function Onglets() {
  const chemin = usePathname();
  return (
    <nav className="marge-basse fixed inset-x-0 bottom-0 z-20 border-t border-or-clair/60 bg-blanc/95 backdrop-blur">
      <ul className="mx-auto grid max-w-xl grid-cols-4">
        {ONGLETS.map((o) => {
          const actif = chemin === o.href || chemin.startsWith(o.href + "/");
          const deposer = o.href === "/deposer";
          return (
            <li key={o.href}>
              <Link
                href={o.href}
                aria-current={actif ? "page" : undefined}
                className={`flex min-h-[60px] flex-col items-center justify-center gap-0.5 text-xs font-medium ${
                  actif ? "text-or-fonce" : "text-encre-doux"
                }`}
              >
                <span
                  aria-hidden
                  className={
                    deposer
                      ? "flex size-10 items-center justify-center rounded-full bg-or text-blanc shadow-sm"
                      : "flex size-7 items-center justify-center"
                  }
                >
                  {o.icone}
                </span>
                {o.texte}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
