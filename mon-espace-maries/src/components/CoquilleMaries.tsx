"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Icones } from "@/components/ui";
import { useEspace } from "@/lib/espace";
import { seDeconnecter } from "@/lib/session";
import { supabaseNavigateur } from "@/lib/supabase/navigateur";
import { formatDate, joursAvant } from "@/lib/calculs";
import type { Dictionnaire } from "@/lib/i18n";

type Partie = { href: string; texte: (t: Dictionnaire) => string; icone: (c?: string) => ReactNode };

// Barre du bas (téléphone) : les 5 onglets principaux
const ONGLETS: Partie[] = [
  { href: "/espace", texte: (t) => t.nav.accueil, icone: Icones.accueil },
  { href: "/espace/planning", texte: (t) => t.nav.planning, icone: Icones.planning },
  { href: "/espace/budget", texte: (t) => t.nav.budget, icone: Icones.budget },
  { href: "/espace/documents", texte: (t) => t.nav.documents, icone: Icones.documents },
  { href: "/espace/album", texte: (t) => t.nav.album, icone: Icones.album },
];

// Les autres parties (tuiles de l'accueil sur téléphone, menu latéral sur ordinateur)
export const AUTRES: Partie[] = [
  { href: "/espace/a-faire", texte: (t) => t.nav.aFaire, icone: Icones.aFaire },
  { href: "/espace/rendez-vous", texte: (t) => t.nav.rendezVous, icone: Icones.rdv },
  { href: "/espace/deroule", texte: (t) => t.nav.deroule, icone: Icones.deroule },
  { href: "/espace/paiements", texte: (t) => t.nav.paiements, icone: Icones.paiements },
  { href: "/espace/questionnaire", texte: (t) => t.nav.questionnaire, icone: Icones.questionnaire },
  { href: "/espace/prestataires", texte: (t) => t.nav.prestataires, icone: Icones.prestataires },
  { href: "/espace/proches", texte: (t) => t.nav.proches, icone: Icones.proches },
];

function estActif(chemin: string, href: string) {
  return href === "/espace" ? chemin === "/espace" : chemin === href || chemin.startsWith(href + "/");
}

// Nombre de notifications non lues (rafraîchi à chaque changement de page)
function useNonLues(chemin: string) {
  const [n, setN] = useState(0);
  useEffect(() => {
    supabaseNavigateur()
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .is("lu_le", null)
      .then(({ count }) => setN(count ?? 0));
  }, [chemin]);
  return n;
}

export function CoquilleMaries({ children }: { children: ReactNode }) {
  const { couple, t, langue } = useEspace();
  const chemin = usePathname();
  const nonLues = useNonLues(chemin);
  const j = joursAvant(couple.date_mariage);
  const noms = `${couple.prenom_1} & ${couple.prenom_2}`;
  const sousTitre = [formatDate(couple.date_mariage, langue, { weekday: "long", day: "numeric", month: "long", year: "numeric" }), couple.lieu].filter(Boolean).join(" · ");
  const ongletPrincipal = ONGLETS.some((o) => estActif(chemin, o.href));

  return (
    <div className="flex min-h-full flex-1 lg:flex-row">
      {/* Menu latéral : ordinateur */}
      <aside className="sans-impression sticky top-0 hidden h-dvh w-72 shrink-0 flex-col overflow-y-auto border-r border-trait bg-carte/60 px-5 py-6 lg:flex">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-bordeaux">{t.marque}</p>
        <p className="mt-1 font-titre text-[28px] font-semibold leading-tight">{noms}</p>
        <p className="text-[13px] text-doux">{sousTitre}</p>
        {j >= 0 && <p className="mt-2 font-titre text-2xl font-semibold text-bordeaux">{t.accueil.avant(j)}</p>}
        <nav className="mt-6 flex flex-col gap-0.5" aria-label={t.nav.espace}>
          {[...ONGLETS, ...AUTRES].map((p) => (
            <LienMenu key={p.href} href={p.href} actif={estActif(chemin, p.href)} icone={p.icone("size-5")} texte={p.texte(t)} />
          ))}
          <div className="my-3 h-px bg-trait" />
          <LienMenu href="/espace/notifications" actif={estActif(chemin, "/espace/notifications")} icone={Icones.cloche("size-5")}
            texte={t.nav.notifications} badge={nonLues} />
          <button type="button" onClick={seDeconnecter} className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-left text-sm text-doux hover:bg-fond">
            {Icones.sortie()} {t.nav.deconnexion}
          </button>
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* En-tête : téléphone */}
        <header className="sans-impression relative border-b border-trait px-5 pb-3.5 pt-5 lg:hidden">
          <Link href="/espace/notifications" aria-label={t.nav.notifications}
            className="absolute right-4 top-4 flex size-11 items-center justify-center rounded-full border border-trait bg-carte text-bordeaux">
            {Icones.cloche()}
            {nonLues > 0 && (
              <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-tangerine px-1 text-[10px] font-bold text-encre">{nonLues}</span>
            )}
          </Link>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-bordeaux">{t.marque}</p>
          <p className="pr-12 font-titre text-[30px] font-semibold leading-tight">{noms}</p>
          <p className="text-[13px] text-doux">{sousTitre}</p>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-28 pt-4 sm:px-6 lg:px-10 lg:pb-12 lg:pt-8">
          {!ongletPrincipal && (
            <Link href="/espace" className="sans-impression mb-2 inline-flex min-h-8 items-center text-sm font-medium text-bordeaux lg:hidden">{t.retourAccueil}</Link>
          )}
          {children}
        </main>

        {/* Barre d'onglets : téléphone */}
        <nav className="sans-impression marge-basse fixed inset-x-0 bottom-0 z-20 border-t border-trait bg-carte/95 backdrop-blur lg:hidden" aria-label={t.nav.espace}>
          <ul className="mx-auto grid max-w-xl grid-cols-5">
            {ONGLETS.map((o) => {
              const actif = estActif(chemin, o.href);
              return (
                <li key={o.href}>
                  <Link href={o.href} aria-current={actif ? "page" : undefined}
                    className={`flex min-h-[60px] flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${actif ? "text-bordeaux" : "text-doux"}`}>
                    {o.icone()}
                    {o.texte(t)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </div>
  );
}

function LienMenu({ href, actif, icone, texte, badge = 0 }: { href: string; actif: boolean; icone: ReactNode; texte: string; badge?: number }) {
  return (
    <Link href={href} aria-current={actif ? "page" : undefined}
      className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm ${actif ? "bg-bordeaux text-fond" : "text-encre hover:bg-fond"}`}>
      {icone}
      <span className="flex-1">{texte}</span>
      {badge > 0 && <span className="rounded-full bg-tangerine px-2 text-[11px] font-bold text-encre">{badge}</span>}
    </Link>
  );
}
