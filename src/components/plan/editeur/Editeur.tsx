"use client";
// Éditeur de plan de salle : commun à « Mon plan de salle » et à Ma Coordo.
// - modifications au doigt (glisser, régler), annuler / rétablir
// - enregistrement automatique en ligne ~1,5 s après chaque modification
// - si le plan a été modifié ailleurs entre-temps : on prévient, rien n'est écrasé
// - mises à jour en direct quand le plan change sur un autre appareil
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Feuille } from "@/components/ui/Feuille";
import { supabaseNavigateur } from "@/lib/supabase/navigateur";
import { enregistrerContenu, lirePlan } from "@/lib/plans";
import { estErreurReseau } from "@/lib/memoire";
import { nouvelElement, majElement } from "@/plan/actions";
import { alertes, numeroterTables } from "@/plan/moteur";
import type { Plan, PlanContenu, TypeElement } from "@/plan/types";
import { Canevas, type CanevasPoignee } from "./Canevas";
import { FenetreHistorique, FenetreImage, FenetreImport, FenetreRecap, FenetreSalle } from "./Fenetres";
import { Panneau } from "./Panneau";
import { useHistorique } from "./useHistorique";

type Fenetre = "salle" | "recap" | "import" | "historique" | "image" | "menu" | null;
type EtatEnregistrement = "enregistre" | "en-attente" | "en-cours" | "hors-ligne" | "conflit" | "erreur";

const brouillon = (id: string) => `macoordo:plan-brouillon:${id}`;

export function Editeur({ plan, retour }: { plan: Plan; retour: { href: string; texte: string } }) {
  const lectureSeule = plan.role === "lecteur";
  const h = useHistorique(plan.contenu);
  const { contenu, modifier, apercu, valider } = h;
  const [selection, setSelection] = useState<string | null>(null);
  const [fenetre, setFenetre] = useState<Fenetre>(null);
  const [etat, setEtat] = useState<EtatEnregistrement>("enregistre");
  const version = useRef(plan.version);
  const avantGeste = useRef<PlanContenu | null>(null);
  const canevas = useRef<CanevasPoignee>(null);
  const dernierEnregistre = useRef<PlanContenu>(plan.contenu);
  const contenuRef = useRef(contenu);
  useEffect(() => {
    contenuRef.current = contenu;
  }, [contenu]);

  const { enDefaut, messages } = useMemo(() => alertes(contenu), [contenu]);
  const choisi = contenu.items.find((i) => i.id === selection) ?? null;

  const etatRef = useRef(etat);
  useEffect(() => {
    etatRef.current = etat;
  }, [etat]);

  // ---------- Enregistrement automatique ----------
  const enregistrer = useCallback(async () => {
    const aEnregistrer = contenuRef.current;
    if (aEnregistrer === dernierEnregistre.current) return setEtat("enregistre");
    setEtat("en-cours");
    try {
      const v = await enregistrerContenu(plan.id, aEnregistrer, version.current);
      if (v === null) return setEtat("conflit");
      version.current = v;
      dernierEnregistre.current = aEnregistrer;
      try {
        localStorage.removeItem(brouillon(plan.id));
      } catch {}
      setEtat(contenuRef.current === aEnregistrer ? "enregistre" : "en-attente");
    } catch (e) {
      // Pas de réseau : les modifications sont gardées sur l'appareil
      try {
        localStorage.setItem(brouillon(plan.id), JSON.stringify({ version: version.current, contenu: aEnregistrer }));
      } catch {}
      setEtat(estErreurReseau(e) ? "hors-ligne" : "erreur");
    }
  }, [plan.id]);

  useEffect(() => {
    if (lectureSeule || h.modifie === 0) return;
    // Une modification vient d'avoir lieu : enregistrement dans 1,5 s
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEtat((e) => (e === "conflit" ? e : "en-attente"));
    const t = setTimeout(() => {
      if (etatRef.current !== "conflit") enregistrer();
    }, 1500);
    return () => clearTimeout(t);
  }, [h.modifie, lectureSeule, enregistrer]);

  // Retour du réseau, ou départ de la page : on enregistre tout de suite
  useEffect(() => {
    const maintenant = () => {
      if (etatRef.current !== "conflit" && contenuRef.current !== dernierEnregistre.current) enregistrer();
    };
    const avantDepart = (e: BeforeUnloadEvent) => {
      if (contenuRef.current !== dernierEnregistre.current) {
        maintenant();
        e.preventDefault();
      }
    };
    const masque = () => document.visibilityState === "hidden" && maintenant();
    window.addEventListener("online", maintenant);
    window.addEventListener("beforeunload", avantDepart);
    document.addEventListener("visibilitychange", masque);
    return () => {
      window.removeEventListener("online", maintenant);
      window.removeEventListener("beforeunload", avantDepart);
      document.removeEventListener("visibilitychange", masque);
    };
  }, [enregistrer]);

  // Brouillon resté sur l'appareil (modifications faites sans réseau)
  useEffect(() => {
    try {
      const b = JSON.parse(localStorage.getItem(brouillon(plan.id)) ?? "null") as { version: number; contenu: PlanContenu } | null;
      if (b && b.version === plan.version && !lectureSeule) {
        modifier(() => b.contenu);
      } else if (b) localStorage.removeItem(brouillon(plan.id));
    } catch {}
  }, [plan.id, plan.version, lectureSeule, modifier]);

  // ---------- Mises à jour en direct (autre appareil, autre personne) ----------
  const recharger = useCallback(async () => {
    const frais = await lirePlan(plan.id);
    if (!frais) return;
    version.current = frais.version;
    dernierEnregistre.current = frais.contenu;
    h.remplacer(frais.contenu);
    setEtat("enregistre");
  }, [plan.id, h]);

  useEffect(() => {
    const supabase = supabaseNavigateur();
    const canal = supabase
      .channel(`plan:${plan.id}`)
      .on("broadcast", { event: "maj" }, ({ payload }) => {
        const v = (payload as { version?: number }).version ?? 0;
        if (v <= version.current) return; // c'est notre propre enregistrement
        // Rien en cours chez nous : on affiche la nouvelle version ; sinon conflit à la sauvegarde
        if (contenuRef.current === dernierEnregistre.current) recharger();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
  }, [plan.id, recharger]);

  // ---------- Actions ----------
  function ajouter(type: TypeElement) {
    const c = canevas.current?.centre() ?? { x: contenu.room.w / 2, y: contenu.room.h / 2 };
    const e = nouvelElement(contenu, type, c.x, c.y);
    modifier((x) => ({ ...x, items: [...x.items, e] }));
    setSelection(e.id);
  }

  // Raccourcis clavier sur ordinateur : Ctrl+Z / Ctrl+Maj+Z
  useEffect(() => {
    const clavier = (e: KeyboardEvent) => {
      if (lectureSeule || !(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "z") return;
      if ((e.target as HTMLElement).closest("input, textarea, select")) return;
      e.preventDefault();
      if (e.shiftKey) h.retablir();
      else h.annuler();
    };
    window.addEventListener("keydown", clavier);
    return () => window.removeEventListener("keydown", clavier);
  }, [h, lectureSeule]);

  const fermer = useCallback(() => setFenetre(null), []);
  const textesEtat: Record<EtatEnregistrement, string> = {
    enregistre: "✓ Enregistré",
    "en-attente": "Modifié…",
    "en-cours": "Enregistrement…",
    "hors-ligne": "📡 Hors ligne : gardé sur l'appareil",
    conflit: "⚠ Modifié ailleurs",
    erreur: "⚠ Non enregistré",
  };

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      {/* En-tête */}
      <header className="flex items-center gap-2 border-b border-or-clair/50 bg-blanc px-3 py-2">
        <Link href={retour.href} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-or-fonce" aria-label={retour.texte}>
          ←
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{plan.nom}</p>
          <p className={`truncate text-[11px] ${etat === "conflit" || etat === "erreur" ? "text-alerte" : "text-encre-doux"}`}>
            {lectureSeule ? "Lecture seule" : textesEtat[etat]}
          </p>
        </div>
        {!lectureSeule && (
          <>
            <button type="button" onClick={h.annuler} disabled={!h.peutAnnuler} aria-label="Annuler" className="flex h-10 w-10 items-center justify-center rounded-full text-lg ring-1 ring-or-clair disabled:opacity-30">
              ↶
            </button>
            <button type="button" onClick={h.retablir} disabled={!h.peutRetablir} aria-label="Rétablir" className="flex h-10 w-10 items-center justify-center rounded-full text-lg ring-1 ring-or-clair disabled:opacity-30">
              ↷
            </button>
          </>
        )}
        <button type="button" onClick={() => setFenetre("menu")} aria-label="Plus d'actions" className="flex h-10 w-10 items-center justify-center rounded-full text-xl ring-1 ring-or-clair">
          ⋯
        </button>
      </header>

      {etat === "conflit" && (
        <div className="flex flex-wrap items-center gap-2 bg-alerte/10 px-3 py-2 text-sm text-alerte">
          <p className="flex-1">Ce plan a été modifié sur un autre appareil ou par une autre personne.</p>
          <button type="button" onClick={recharger} className="min-h-[36px] rounded-full bg-blanc px-3 font-medium">
            Voir la dernière version
          </button>
          <button
            type="button"
            onClick={async () => {
              const frais = await lirePlan(plan.id);
              if (frais) version.current = frais.version;
              setEtat("en-attente");
              enregistrer();
            }}
            className="min-h-[36px] rounded-full px-3 underline underline-offset-4"
          >
            Garder la mienne
          </button>
        </div>
      )}

      {/* Plan */}
      <main className="relative min-h-0 flex-1 bg-creme">
        <Canevas
          poignee={canevas}
          contenu={contenu}
          enDefaut={enDefaut}
          selection={selection}
          peutDeplacer={(e) => !lectureSeule && !e.verrou}
          onChoisir={setSelection}
          onDebutDeplacement={() => {
            avantGeste.current = contenuRef.current;
          }}
          onDeplacer={(id, x, y) => apercu((c) => majElement(c, id, { x, y }))}
          onFinDeplacement={(bouge) => {
            if (bouge && avantGeste.current) valider(avantGeste.current);
            avantGeste.current = null;
          }}
        />
        <button
          type="button"
          onClick={() => setSelection(null)}
          className={`absolute left-2.5 top-2.5 rounded-full px-3 py-1.5 text-xs font-semibold text-blanc ${messages.length ? "bg-alerte" : "bg-succes"}`}
        >
          {messages.length ? `⚠ ${messages.length} alerte${messages.length > 1 ? "s" : ""}` : "✓ Circulation OK"}
        </button>
      </main>

      {/* Panneau du bas */}
      <section className="max-h-[46dvh] overflow-y-auto border-t border-or-clair/50 bg-blanc px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        <Panneau
          contenu={contenu}
          selection={choisi}
          alertes={messages}
          lectureSeule={lectureSeule}
          modifier={modifier}
          onChoisir={setSelection}
          onAjouter={ajouter}
          onImporterInvites={() => setFenetre("import")}
        />
      </section>

      {/* Fenêtres */}
      <Feuille titre="Plan" ouverte={fenetre === "menu"} onFermer={fermer}>
        <div className="flex flex-col gap-2">
          {[
            !lectureSeule && ["salle", "📐 La salle : dimensions, forme, passage"],
            ["recap", "📋 Récapitulatif (matériel, menus, placement)"],
            ["image", "🖼️ Image du plan (PNG)"],
            !lectureSeule && ["import", "👥 Importer une liste d'invités"],
            ["historique", "🕘 Historique des versions"],
          ]
            .filter(Boolean)
            .map((x) => {
              const [cle, texte] = x as [Fenetre, string];
              return (
                <button key={cle} type="button" onClick={() => setFenetre(cle)} className="min-h-[52px] rounded-2xl bg-blanc px-4 text-left ring-1 ring-or-clair/60">
                  {texte}
                </button>
              );
            })}
          <a href={`/plans/${plan.id}/imprimer`} className="flex min-h-[52px] items-center rounded-2xl bg-blanc px-4 ring-1 ring-or-clair/60">
            🖨️ Version imprimable / PDF
          </a>
          {!lectureSeule && (
            <button
              type="button"
              onClick={() => {
                modifier(numeroterTables);
                fermer();
              }}
              className="min-h-[52px] rounded-2xl bg-blanc px-4 text-left ring-1 ring-or-clair/60"
            >
              🔢 Renuméroter les tables (de gauche à droite)
            </button>
          )}
        </div>
      </Feuille>
      <Feuille titre="La salle" ouverte={fenetre === "salle"} onFermer={fermer}>
        {fenetre === "salle" && <FenetreSalle contenu={contenu} modifier={modifier} onFini={fermer} />}
      </Feuille>
      <Feuille titre="Récapitulatif" ouverte={fenetre === "recap"} onFermer={fermer}>
        {fenetre === "recap" && <FenetreRecap contenu={contenu} planId={plan.id} />}
      </Feuille>
      <Feuille titre="Importer des invités" ouverte={fenetre === "import"} onFermer={fermer}>
        {fenetre === "import" && <FenetreImport contenu={contenu} modifier={modifier} onFini={fermer} />}
      </Feuille>
      <Feuille titre="Historique des versions" ouverte={fenetre === "historique"} onFermer={fermer}>
        {fenetre === "historique" && (
          <FenetreHistorique
            planId={plan.id}
            versionActuelle={() => version.current}
            contenu={contenu}
            lectureSeule={lectureSeule}
            onRestaurer={(c) => {
              modifier(() => c);
              fermer();
            }}
          />
        )}
      </Feuille>
      <Feuille titre="Image du plan" ouverte={fenetre === "image"} onFermer={fermer}>
        {fenetre === "image" && <FenetreImage contenu={contenu} />}
      </Feuille>
    </div>
  );
}
