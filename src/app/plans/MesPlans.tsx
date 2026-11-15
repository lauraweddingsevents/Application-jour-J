"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bouton } from "@/components/ui/Bouton";
import { Carte } from "@/components/ui/Carte";
import { Champ } from "@/components/ui/Champ";
import { Choix } from "@/components/ui/Choix";
import { Feuille } from "@/components/ui/Feuille";
import { ZoneTexte } from "@/components/ui/ZoneTexte";
import { Protege } from "@/components/Protege";
import { DessinPlan } from "@/components/plan/DessinPlan";
import { EnTetePlan } from "@/components/plan/EnTetePlan";
import { messageErreur } from "@/lib/erreurs";
import {
  archiverPlan,
  creerPlan,
  dupliquerPlan,
  importerPlan,
  listerPlans,
  renommerPlan,
  supprimerPlan,
} from "@/lib/plans";
import { ilYa } from "@/lib/temps";
import { planVide } from "@/plan/exemple";
import { pluriel, resume } from "@/plan/moteur";
import type { Plan } from "@/plan/types";

export function MesPlans() {
  return (
    <Protege connexion="/plans/connexion">
      <Contenu />
    </Protege>
  );
}

type Fenetre = { type: "nouveau" } | { type: "importer" } | { type: "actions"; plan: Plan } | null;

function Contenu() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [erreur, setErreur] = useState("");
  const [fenetre, setFenetre] = useState<Fenetre>(null);
  const [voirArchives, setVoirArchives] = useState(false);
  const fermer = useCallback(() => setFenetre(null), []);
  // Ouvre un plan en refermant d'abord la fenêtre (sinon elle reste ouverte au retour)
  const ouvrir = (id: string) => {
    setFenetre(null);
    router.push(`/plans/${id}`);
  };

  const charger = useCallback(() => {
    listerPlans()
      .then(setPlans)
      .catch((e) => setErreur(messageErreur(e)));
  }, []);
  useEffect(charger, [charger]);

  const actifs = (plans ?? []).filter((p) => !p.archive);
  const archives = (plans ?? []).filter((p) => p.archive);
  const affiches = voirArchives ? archives : actifs;

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-6">
      <EnTetePlan />
      <h1 className="mt-8 text-2xl font-medium">Mes plans</h1>

      <div className="mt-6 flex gap-2">
        <Bouton className="flex-1" onClick={() => setFenetre({ type: "nouveau" })}>
          <span aria-hidden className="text-xl leading-none">+</span> Nouveau plan
        </Bouton>
      </div>

      {erreur && <p className="mt-6 text-alerte">{erreur}</p>}
      {plans === null && !erreur && <p className="mt-10 text-center text-encre-doux">Chargement…</p>}

      {plans?.length === 0 && (
        <Carte className="mt-6 text-center">
          <p className="text-3xl" aria-hidden>🪑</p>
          <h2 className="mt-2 font-medium">Aucun plan pour l&apos;instant</h2>
          <p className="mt-1 text-sm text-encre-doux">Créez votre premier plan de salle : un exemple vous attend pour démarrer.</p>
        </Carte>
      )}

      {archives.length > 0 && (
        <div className="mt-6">
          <Choix<"actifs" | "archives">
            libelle="Afficher"
            valeur={voirArchives ? "archives" : "actifs"}
            onChange={(v) => setVoirArchives(v === "archives")}
            options={[
              { valeur: "actifs", texte: `En cours (${actifs.length})` },
              { valeur: "archives", texte: `Archivés (${archives.length})` },
            ]}
          />
        </div>
      )}

      <ul className="mt-6 flex flex-col gap-3">
        {affiches.map((p) => {
          const r = resume(p.contenu);
          return (
            <li key={p.id}>
              <Carte className="flex gap-3 p-3">
                <Link href={`/plans/${p.id}`} className="flex min-w-0 flex-1 gap-3">
                  <span className="w-24 shrink-0 overflow-hidden rounded-xl bg-creme ring-1 ring-or-clair/40">
                    <DessinPlan plan={p.contenu} cotes={false} className="h-auto w-full" />
                  </span>
                  <span className="min-w-0 flex-1 py-1">
                    <span className="block truncate font-medium">{p.nom}</span>
                    <span className="block text-sm text-encre-doux">
                      {pluriel(r.tables, "table")} · {pluriel(r.places, "place")}
                      {r.invites ? ` · ${pluriel(r.invites, "invité")}` : ""}
                    </span>
                    <span className="block text-xs text-encre-doux">
                      Modifié {ilYa(p.updated_at)}
                      {p.role && p.role !== "proprietaire" && ` · partagé avec vous (${p.role === "editeur" ? "modification" : "lecture"})`}
                    </span>
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={() => setFenetre({ type: "actions", plan: p })}
                  className="flex h-11 w-11 shrink-0 items-center justify-center self-center rounded-full text-xl text-encre-doux ring-1 ring-or-clair/60"
                  aria-label={`Actions pour ${p.nom}`}
                >
                  ⋯
                </button>
              </Carte>
            </li>
          );
        })}
      </ul>

      <p className="mt-8 text-center text-sm">
        <button type="button" onClick={() => setFenetre({ type: "importer" })} className="min-h-[44px] text-or-fonce underline underline-offset-4">
          Importer un plan de l&apos;ancien outil
        </button>
      </p>

      <Feuille titre="Nouveau plan" ouverte={fenetre?.type === "nouveau"} onFermer={fermer}>
        <NouveauPlan onCree={(p) => ouvrir(p.id)} />
      </Feuille>
      <Feuille titre="Importer un plan" ouverte={fenetre?.type === "importer"} onFermer={fermer}>
        <Importer onImporte={(p) => ouvrir(p.id)} />
      </Feuille>
      <Feuille titre={fenetre?.type === "actions" ? fenetre.plan.nom : ""} ouverte={fenetre?.type === "actions"} onFermer={fermer}>
        {fenetre?.type === "actions" && (
          <Actions
            plan={fenetre.plan}
            onFini={() => {
              fermer();
              charger();
            }}
            onOuvrir={ouvrir}
          />
        )}
      </Feuille>
    </main>
  );
}

function NouveauPlan({ onCree }: { onCree: (p: Plan) => void }) {
  const [nom, setNom] = useState("");
  const [depart, setDepart] = useState<"exemple" | "vide">("exemple");
  const [largeur, setLargeur] = useState("20");
  const [longueur, setLongueur] = useState("14");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState("");
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setEnCours(true);
        setErreur("");
        try {
          const n = nom.trim() || "Mon plan";
          const l = parseFloat(largeur.replace(",", "."));
          const L = parseFloat(longueur.replace(",", "."));
          onCree(await creerPlan(n, depart === "vide" ? planVide(n, l > 0 ? l : 20, L > 0 ? L : 14) : "exemple"));
        } catch (err) {
          setErreur(messageErreur(err as Error));
          setEnCours(false);
        }
      }}
    >
      <Champ id="nomPlan" libelle="Nom du plan" placeholder="Mariage de Camille & Julien – Orangerie" value={nom} onChange={(e) => setNom(e.target.value)} autoComplete="off" />
      <Choix<"exemple" | "vide">
        libelle="Pour commencer"
        valeur={depart}
        onChange={setDepart}
        options={[
          { valeur: "exemple", texte: "Avec un exemple" },
          { valeur: "vide", texte: "Salle vide" },
        ]}
      />
      {depart === "vide" && (
        <div className="grid grid-cols-2 gap-3">
          <Champ id="largeur" libelle="Largeur (m)" inputMode="decimal" value={largeur} onChange={(e) => setLargeur(e.target.value)} />
          <Champ id="longueur" libelle="Longueur (m)" inputMode="decimal" value={longueur} onChange={(e) => setLongueur(e.target.value)} />
        </div>
      )}
      {erreur && <p className="text-sm text-alerte">{erreur}</p>}
      <Bouton type="submit" disabled={enCours}>{enCours ? "Création…" : "Créer le plan"}</Bouton>
    </form>
  );
}

function Importer({ onImporte }: { onImporte: (p: Plan) => void }) {
  const [code, setCode] = useState("");
  const [erreur, setErreur] = useState("");
  const [enCours, setEnCours] = useState(false);
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-encre-doux">
        Dans l&apos;ancien outil (plan-de-salle.html), touchez « Salle », puis « Copier le code du plan », et collez-le ici.
      </p>
      <ZoneTexte id="code" libelle="Code du plan" value={code} onChange={(e) => setCode(e.target.value)} placeholder='{"name":"Mon mariage","room":…}' />
      {erreur && <p className="text-sm text-alerte">{erreur}</p>}
      <Bouton
        disabled={!code.trim() || enCours}
        onClick={async () => {
          setEnCours(true);
          setErreur("");
          try {
            onImporte(await importerPlan(code));
          } catch (e) {
            setErreur((e as Error).message === "code-invalide" ? "Ce code n'est pas un code de plan valide." : messageErreur(e as Error));
            setEnCours(false);
          }
        }}
      >
        {enCours ? "Import…" : "Importer ce plan"}
      </Bouton>
    </div>
  );
}

function Actions({ plan, onFini, onOuvrir }: { plan: Plan; onFini: () => void; onOuvrir: (id: string) => void }) {
  const [nom, setNom] = useState(plan.nom);
  const [confirmer, setConfirmer] = useState(false);
  const [erreur, setErreur] = useState("");
  const proprietaire = plan.role === "proprietaire";
  const peutModifier = plan.role === "proprietaire" || plan.role === "editeur";

  async function agir(action: () => Promise<unknown>) {
    setErreur("");
    try {
      await action();
      onFini();
    } catch (e) {
      setErreur(messageErreur(e as Error));
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Bouton onClick={() => onOuvrir(plan.id)}>Ouvrir le plan</Bouton>
      {peutModifier && (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (nom.trim()) agir(() => renommerPlan(plan.id, nom, plan.contenu));
          }}
        >
          <input
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            aria-label="Nouveau nom"
            className="min-h-[52px] min-w-0 flex-1 rounded-2xl border border-or-clair bg-blanc px-4"
          />
          <Bouton type="submit" variante="secondaire" disabled={!nom.trim() || nom === plan.nom}>
            Renommer
          </Bouton>
        </form>
      )}
      <Bouton variante="secondaire" onClick={() => agir(() => dupliquerPlan(plan))}>
        Dupliquer
      </Bouton>
      {peutModifier && (
        <Bouton variante="secondaire" onClick={() => agir(() => archiverPlan(plan.id, !plan.archive))}>
          {plan.archive ? "Sortir des archives" : "Archiver"}
        </Bouton>
      )}
      {proprietaire &&
        (!confirmer ? (
          <Bouton variante="discret" onClick={() => setConfirmer(true)}>
            Supprimer ce plan
          </Bouton>
        ) : (
          <div className="flex flex-col gap-2 rounded-2xl bg-blanc p-4 text-center">
            <p className="text-sm">Supprimer définitivement « {plan.nom} » et tous ses invités ?</p>
            <Bouton variante="danger" onClick={() => agir(() => supprimerPlan(plan.id))}>
              Oui, supprimer
            </Bouton>
            <Bouton variante="discret" onClick={() => setConfirmer(false)}>
              Annuler
            </Bouton>
          </div>
        ))}
      {erreur && <p className="text-sm text-alerte">{erreur}</p>}
    </div>
  );
}
