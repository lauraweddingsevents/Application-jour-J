"use client";
// Ouverture d'un lien de partage de plan :
// - lecture seule : le plan s'affiche, sans compte ;
// - modification : connexion (ou création de compte), puis ouverture de l'éditeur.
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { BoutonLien, Bouton } from "@/components/ui/Bouton";
import { Carte } from "@/components/ui/Carte";
import { Canevas } from "@/components/plan/editeur/Canevas";
import { LogoPlan } from "@/components/plan/LogoPlan";
import { messageErreur } from "@/lib/erreurs";
import { planParLien, rejoindreParLien, type VuePlanParLien } from "@/lib/partagePlans";
import { useSession } from "@/lib/useSession";
import { normaliser } from "@/plan/normaliser";
import { alertes, estTable, places, pluriel, recapitulatif, resume, texteMenus } from "@/plan/moteur";
import type { PlanContenu } from "@/plan/types";

export function LienPlan() {
  const { jeton } = useParams<{ jeton: string }>();
  const router = useRouter();
  const session = useSession();
  const [vue, setVue] = useState<VuePlanParLien | null | undefined>(undefined);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    planParLien(jeton)
      .then(setVue)
      .catch(() => setVue(null));
  }, [jeton, session?.user.id]);

  // Lien de modification + connectée : on rejoint le plan et on ouvre l'éditeur
  useEffect(() => {
    if (!vue || vue.role !== "editeur" || !session) return;
    rejoindreParLien(jeton)
      .then((id) => router.replace(`/plans/${id}`))
      .catch((e) => setErreur(messageErreur(e)));
  }, [vue, session, jeton, router]);

  if (vue === undefined || session === undefined) return <p className="mt-20 text-center text-encre-doux">Chargement…</p>;

  if (vue === null)
    return (
      <Message titre="Ce lien n'est plus valable">
        Il a peut-être été désactivé. Demandez un nouveau lien à la personne qui vous l&apos;a envoyé.
      </Message>
    );

  if (vue.role === "editeur") {
    if (session) return <Message titre="Ouverture du plan…">{erreur || "Un instant."}</Message>;
    return (
      <Message titre={`Plan de salle « ${vue.nom} »`}>
        Vous êtes invité·e à modifier ce plan. Connectez-vous, ou créez votre compte en quelques secondes.
        <BoutonLien href={`/plans/connexion?suite=${encodeURIComponent(`/p/${jeton}`)}`} className="mt-6 w-full">
          Me connecter pour modifier
        </BoutonLien>
      </Message>
    );
  }

  return <Visionneuse vue={vue} jeton={jeton} connecte={!!session} />;
}

function Message({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <LogoPlan taille="grand" />
      <h1 className="mt-8 text-xl font-medium">{titre}</h1>
      <div className="mt-3 w-full text-encre-doux">{children}</div>
    </main>
  );
}

// Plan en lecture seule (sans compte) : plan à l'échelle, tables et récapitulatif
function Visionneuse({ vue, jeton, connecte }: { vue: VuePlanParLien; jeton: string; connecte: boolean }) {
  const router = useRouter();
  const contenu: PlanContenu = normaliser(vue.contenu!);
  const [onglet, setOnglet] = useState<"tables" | "recap">("tables");
  const [selection, setSelection] = useState<string | null>(null);
  const { enDefaut } = alertes(contenu);
  const r = resume(contenu);
  const tables = contenu.items.filter(estTable);
  const choisie = tables.find((t) => t.id === selection);

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <header className="flex items-center justify-between gap-2 border-b border-or-clair/50 bg-blanc px-4 py-2">
        <div className="min-w-0">
          <p className="truncate font-medium">{vue.nom}</p>
          <p className="text-[11px] text-encre-doux">
            Lecture seule · {pluriel(r.tables, "table")} · {pluriel(r.places, "place")}
          </p>
        </div>
        <Link href="/plan-de-salle" className="shrink-0">
          <LogoPlan />
        </Link>
      </header>
      <main className="relative min-h-0 flex-1 bg-creme">
        <Canevas
          contenu={contenu}
          enDefaut={enDefaut}
          selection={selection}
          peutDeplacer={() => false}
          onChoisir={setSelection}
          onDebutDeplacement={() => {}}
          onDeplacer={() => {}}
          onFinDeplacement={() => {}}
        />
      </main>
      <section className="max-h-[44dvh] overflow-y-auto border-t border-or-clair/50 bg-blanc px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        {choisie ? (
          <Carte className="p-3">
            <div className="flex items-center justify-between">
              <p className="font-medium">
                {choisie.name} <span className="text-sm font-normal text-encre-doux">({choisie.guests.length}/{places(choisie)})</span>
              </p>
              <button type="button" onClick={() => setSelection(null)} className="h-9 w-9 rounded-full bg-creme" aria-label="Fermer">×</button>
            </div>
            {texteMenus(choisie.guests) && <p className="text-sm text-encre-doux">{texteMenus(choisie.guests)}</p>}
            <ul className="mt-2 text-sm">
              {choisie.guests.map((g) => (
                <li key={g.id}>· {g.nom}</li>
              ))}
            </ul>
          </Carte>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-1 rounded-full bg-creme-fonce p-1">
              {(["tables", "recap"] as const).map((o) => (
                <button key={o} type="button" aria-pressed={onglet === o} onClick={() => setOnglet(o)} className={`min-h-[40px] rounded-full text-sm font-medium ${onglet === o ? "bg-blanc shadow-sm" : "text-encre-doux"}`}>
                  {o === "tables" ? "Tables" : "Récapitulatif"}
                </button>
              ))}
            </div>
            {onglet === "tables" ? (
              <ul className="mt-3 grid grid-cols-2 gap-2">
                {tables.map((t) => (
                  <li key={t.id}>
                    <button type="button" onClick={() => setSelection(t.id)} className="w-full rounded-xl bg-creme px-3 py-2 text-left text-sm">
                      <span className="font-medium">{t.name}</span>
                      <span className="block text-xs text-encre-doux">
                        {t.guests.length}/{places(t)} couverts{texteMenus(t.guests) ? ` · ${texteMenus(t.guests)}` : ""}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <pre className="mt-3 whitespace-pre-wrap text-xs leading-relaxed">{recapitulatif(contenu)}</pre>
            )}
            {connecte && !vue.deja_membre && (
              <Bouton
                variante="secondaire"
                className="mt-4 w-full"
                onClick={async () => {
                  const id = await rejoindreParLien(jeton);
                  router.push(`/plans/${id}`);
                }}
              >
                Ajouter à mes plans (pour commenter)
              </Bouton>
            )}
            {vue.deja_membre && (
              <BoutonLien href={`/plans/${vue.plan_id}`} variante="secondaire" className="mt-4 w-full">
                Ouvrir dans mes plans
              </BoutonLien>
            )}
          </>
        )}
      </section>
    </div>
  );
}
