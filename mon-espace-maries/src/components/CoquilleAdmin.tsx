"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Chargement, Icones } from "@/components/ui";
import { usePersonne, seDeconnecter } from "@/lib/session";
import { supabaseNavigateur } from "@/lib/supabase/navigateur";

const LIENS = [
  { href: "/admin", texte: "Mes couples", icone: Icones.couples },
  { href: "/admin/modeles", texte: "Modèles types", icone: Icones.modeles },
  { href: "/admin/notifications", texte: "Alertes", icone: Icones.cloche },
  { href: "/admin/reglages", texte: "Réglages", icone: Icones.reglages },
];

const actif = (chemin: string, href: string) => (href === "/admin" ? chemin === "/admin" || chemin.startsWith("/admin/couple") : chemin.startsWith(href));

// Cadre de l'administration (Laura uniquement), en français
export function CoquilleAdmin({ children }: { children: ReactNode }) {
  const router = useRouter();
  const chemin = usePathname();
  const { session, personne } = usePersonne();
  const [nonLues, setNonLues] = useState(0);

  useEffect(() => {
    if (session === null || personne === null) router.replace(`/connexion?suite=${encodeURIComponent(window.location.pathname)}`);
    else if (personne?.role === "marie") router.replace("/espace");
  }, [session, personne, router]);

  useEffect(() => {
    if (personne?.role !== "admin") return;
    supabaseNavigateur().from("notifications").select("id", { count: "exact", head: true }).eq("pour_admin", true).is("lu_le", null)
      .then(({ count }) => setNonLues(count ?? 0));
  }, [chemin, personne]);

  if (personne?.role !== "admin") return <Chargement />;

  return (
    <div className="flex min-h-full flex-1">
      <aside className="sans-impression sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-trait bg-carte/60 px-4 py-6 lg:flex">
        <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-bordeaux">Administration</p>
        <p className="px-2 font-titre text-2xl font-semibold">Mon Espace Mariés</p>
        <nav className="mt-6 flex flex-col gap-0.5" aria-label="Administration">
          {LIENS.map((l) => (
            <Link key={l.href} href={l.href} aria-current={actif(chemin, l.href) ? "page" : undefined}
              className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm ${actif(chemin, l.href) ? "bg-bordeaux text-fond" : "hover:bg-fond"}`}>
              {l.icone("size-5")}
              <span className="flex-1">{l.texte}</span>
              {l.href === "/admin/notifications" && nonLues > 0 && <span className="rounded-full bg-tangerine px-2 text-[11px] font-bold text-encre">{nonLues}</span>}
            </Link>
          ))}
        </nav>
        <button type="button" onClick={seDeconnecter} className="mt-auto flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm text-doux hover:bg-fond">
          {Icones.sortie()} Se déconnecter
        </button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-5 sm:px-6 lg:px-10 lg:pb-12 lg:pt-8">{children}</main>
        <nav className="sans-impression marge-basse fixed inset-x-0 bottom-0 z-20 border-t border-trait bg-carte/95 backdrop-blur lg:hidden" aria-label="Administration">
          <ul className="grid grid-cols-4">
            {LIENS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} aria-current={actif(chemin, l.href) ? "page" : undefined}
                  className={`relative flex min-h-[60px] flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${actif(chemin, l.href) ? "text-bordeaux" : "text-doux"}`}>
                  {l.icone("size-6")}
                  {l.texte.replace("Modèles types", "Modèles")}
                  {l.href === "/admin/notifications" && nonLues > 0 && (
                    <span className="absolute right-[calc(50%-20px)] top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-tangerine px-1 text-[10px] font-bold text-encre">{nonLues}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
