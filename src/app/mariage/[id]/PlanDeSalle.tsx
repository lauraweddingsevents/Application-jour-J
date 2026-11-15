"use client";
// Onglet « Plan de salle » d'un mariage : les plans reliés à ce mariage
// (créés ici, ou plans des mariés reliés avec leur accord).
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bouton } from "@/components/ui/Bouton";
import { Carte } from "@/components/ui/Carte";
import { Champ } from "@/components/ui/Champ";
import { Feuille } from "@/components/ui/Feuille";
import { DessinPlan } from "@/components/plan/DessinPlan";
import { messageErreur } from "@/lib/erreurs";
import {
  annulerDemande,
  creerDepuisModele,
  demanderRattachement,
  detacherPlan,
  listerPlans,
  mesDemandes,
  plansDuMariage,
  type DemandeEnvoyee,
} from "@/lib/plans";
import { planParLien } from "@/lib/partagePlans";
import { ilYa } from "@/lib/temps";
import { peutModifier, useDroits } from "@/lib/droits";
import { useEnLigne } from "@/lib/useEnLigne";
import { nomMariage, type Mariage } from "@/lib/types";
import { pluriel, resume } from "@/plan/moteur";
import type { Plan } from "@/plan/types";
import { NouveauPlan } from "@/app/plans/MesPlans";

type Fenetre = { type: "creer" } | { type: "relier" } | { type: "actions"; plan: Plan } | { type: "envoyee" } | null;

export function PlanDeSalle({ mariage }: { mariage: Mariage }) {
  const router = useRouter();
  const enLigne = useEnLigne();
  const droits = useDroits();
  const modifiable = peutModifier(droits) && enLigne;
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [demandes, setDemandes] = useState<DemandeEnvoyee[]>([]);
  const [erreur, setErreur] = useState("");
  const [fenetre, setFenetre] = useState<Fenetre>(null);
  const fermer = useCallback(() => setFenetre(null), []);
  const retour = `?depuis=${mariage.id}`;

  const charger = useCallback(() => {
    plansDuMariage(mariage.id)
      .then(setPlans)
      .catch((e) => setErreur(messageErreur(e)));
    mesDemandes(mariage.id).then(setDemandes);
  }, [mariage.id]);
  useEffect(charger, [charger]);

  const ouvrir = (id: string, suite = "") => {
    setFenetre(null);
    router.push(`/plans/${id}${retour}${suite}`);
  };

  return (
    <div>
      {erreur && <p className="text-alerte">{erreur}</p>}
      {plans === null && !erreur && <p className="mt-6 text-center text-encre-doux">Chargement…</p>}

      {plans?.length === 0 && (
        <Carte className="text-center">
          <p className="text-3xl" aria-hidden>🪑</p>
          <h2 className="mt-2 font-medium">Pas encore de plan de salle</h2>
          <p className="mt-1 text-sm text-encre-doux">
            Créez le plan ici, ou reliez celui que les mariés ont déjà commencé sur Mon plan de salle.
          </p>
        </Carte>
      )}

      <ul className="flex flex-col gap-3">
        {plans?.map((p) => {
          const r = resume(p.contenu);
          return (
            <li key={p.id}>
              <Carte className="p-3">
                <button type="button" onClick={() => ouvrir(p.id)} className="block w-full text-left">
                  <span className="block overflow-hidden rounded-xl bg-creme ring-1 ring-or-clair/40">
                    <DessinPlan plan={p.contenu} cotes={false} className="h-auto max-h-64 w-full" />
                  </span>
                  <span className="mt-2 block font-medium">{p.nom}</span>
                  <span className="block text-sm text-encre-doux">
                    {pluriel(r.tables, "table")} · {r.invites} invité{r.invites > 1 ? "s" : ""} placé{r.invites > 1 ? "s" : ""}
                    {r.nonPlaces > 0 && ` · ${r.nonPlaces} à placer`}
                  </span>
                  <span className="block text-xs text-encre-doux">
                    Modifié {ilYa(p.updated_at)}
                    {p.role !== "proprietaire" && " · plan des mariés"}
                    {p.role === "lecteur" && " (lecture seule)"}
                  </span>
                </button>
                <div className="mt-3 flex gap-2">
                  <Bouton className="flex-1" onClick={() => ouvrir(p.id)}>
                    {p.role === "lecteur" ? "Voir le plan" : "Ouvrir le plan"}
                  </Bouton>
                  <button
                    type="button"
                    onClick={() => setFenetre({ type: "actions", plan: p })}
                    className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full text-xl text-encre-doux ring-1 ring-or-clair/60"
                    aria-label={`Actions pour ${p.nom}`}
                  >
                    ⋯
                  </button>
                </div>
              </Carte>
            </li>
          );
        })}
      </ul>

      {demandes.length > 0 && (
        <ul className="mt-4 flex flex-col gap-2">
          {demandes.map((d) => (
            <li key={d.id}>
              <Carte className="flex items-center gap-3 p-3">
                <span className="text-2xl" aria-hidden>{d.statut === "refusee" ? "✋" : "⏳"}</span>
                <span className="min-w-0 flex-1 text-sm">
                  <span className="block font-medium">« {d.plan_nom} »</span>
                  <span className="block text-encre-doux">
                    {d.statut === "refusee"
                      ? "Les mariés ont refusé de relier ce plan."
                      : "En attente de l'accord des mariés (dans « Mes plans » de leur compte)."}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    await annulerDemande(d.id);
                    charger();
                  }}
                  className="min-h-[44px] shrink-0 text-sm text-or-fonce underline underline-offset-4"
                >
                  {d.statut === "refusee" ? "Effacer" : "Annuler"}
                </button>
              </Carte>
            </li>
          ))}
        </ul>
      )}

      {plans !== null && (
        <div className="mt-6 flex flex-col gap-2">
          <Bouton disabled={!modifiable} onClick={() => setFenetre({ type: "creer" })}>
            <span aria-hidden className="text-xl leading-none">+</span> Créer un plan
          </Bouton>
          <Bouton variante="secondaire" disabled={!modifiable} onClick={() => setFenetre({ type: "relier" })}>
            🔗 Relier un plan existant
          </Bouton>
          {!enLigne && <p className="text-center text-sm text-encre-doux">Connexion nécessaire pour créer ou relier un plan.</p>}
        </div>
      )}

      <Feuille titre="Créer un plan de salle" ouverte={fenetre?.type === "creer"} onFermer={fermer}>
        {fenetre?.type === "creer" && (
          <NouveauPlan
            modele={false}
            nomInitial={`Mariage ${nomMariage(mariage)}`}
            onCree={async (p) => {
              await demanderRattachement(mariage.id, { plan: p.id });
              ouvrir(p.id);
            }}
          />
        )}
      </Feuille>

      <Feuille titre="Relier un plan existant" ouverte={fenetre?.type === "relier"} onFermer={fermer}>
        {fenetre?.type === "relier" && (
          <Relier
            mariage={mariage}
            dejaRelies={(plans ?? []).map((p) => p.id)}
            onRelie={(resultat, planId) => {
              charger();
              if (resultat === "en_attente") setFenetre({ type: "envoyee" });
              else if (planId) ouvrir(planId);
              else setFenetre(null);
            }}
          />
        )}
      </Feuille>

      <Feuille titre="Demande envoyée" ouverte={fenetre?.type === "envoyee"} onFermer={fermer}>
        <DemandeEnvoyeeInfo mariage={mariage} onFermer={fermer} />
      </Feuille>

      <Feuille titre={fenetre?.type === "actions" ? fenetre.plan.nom : ""} ouverte={fenetre?.type === "actions"} onFermer={fermer}>
        {fenetre?.type === "actions" && (
          <ActionsPlan
            plan={fenetre.plan}
            onOuvrir={(suite) => ouvrir(fenetre.plan.id, suite)}
            onDetache={() => {
              fermer();
              charger();
            }}
          />
        )}
      </Feuille>
    </div>
  );
}

// Lit le jeton d'un lien « …/p/abc123 » (ou le jeton seul)
function lireJeton(texte: string) {
  const t = texte.trim();
  const m = t.match(/\/p\/([A-Za-z0-9_-]+)/);
  if (m) return m[1];
  return /^[A-Za-z0-9_-]{8,}$/.test(t) ? t : null;
}

function Relier({
  mariage,
  dejaRelies,
  onRelie,
}: {
  mariage: Mariage;
  dejaRelies: string[];
  onRelie: (r: "rattache" | "en_attente", planId?: string) => void;
}) {
  const [lien, setLien] = useState("");
  const [mesPlans, setMesPlans] = useState<Plan[]>([]);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    listerPlans()
      .then((l) => setMesPlans(l.filter((p) => !p.est_modele && !p.archive && !p.mariage_id && !dejaRelies.includes(p.id))))
      .catch(() => setMesPlans([]));
  }, [dejaRelies]);

  async function agir(action: () => Promise<void>) {
    setEnCours(true);
    setErreur("");
    try {
      await action();
    } catch (e) {
      setErreur(messageErreur(e as Error));
      setEnCours(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          const jeton = lireJeton(lien);
          if (!jeton) {
            setErreur("Collez le lien complet, qui ressemble à …/p/abc123");
            return;
          }
          agir(async () => {
            const vue = await planParLien(jeton);
            if (!vue) throw new Error("Ce lien ne fonctionne pas (il a peut-être été désactivé).");
            // Lien d'une salle modèle (donné par le lieu) : on crée le plan à partir de cette salle
            if (vue.role === "modele") {
              const id = await creerDepuisModele(jeton, `Mariage ${nomMariage(mariage)}`, true);
              onRelie(await demanderRattachement(mariage.id, { plan: id }), id);
              return;
            }
            onRelie(await demanderRattachement(mariage.id, { jeton }), vue.deja_membre ? vue.plan_id : undefined);
          });
        }}
      >
        <Champ
          id="lienPlan"
          libelle="Lien du plan"
          placeholder="https://mon-plan-de-salle.vercel.app/p/…"
          value={lien}
          onChange={(e) => setLien(e.target.value)}
          autoComplete="off"
        />
        <p className="text-sm text-encre-doux">
          Demandez aux mariés le lien de leur plan (bouton 👥 « Partager » dans leur plan). Ils devront ensuite accepter
          votre demande. Vous pouvez aussi coller le lien d&apos;une salle donné par le lieu de réception.
        </p>
        {erreur && <p className="text-sm text-alerte">{erreur}</p>}
        <Bouton type="submit" disabled={enCours || !lien.trim()}>
          {enCours ? "Un instant…" : "Relier ce plan"}
        </Bouton>
      </form>

      {mesPlans.length > 0 && (
        <div>
          <h3 className="font-medium">Ou choisissez un de vos plans</h3>
          <ul className="mt-2 flex flex-col gap-2">
            {mesPlans.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  disabled={enCours}
                  onClick={() => agir(async () => onRelie(await demanderRattachement(mariage.id, { plan: p.id }), p.id))}
                  className="flex min-h-[52px] w-full items-center gap-3 rounded-2xl bg-blanc px-3 py-2 text-left ring-1 ring-or-clair/60 disabled:opacity-50"
                >
                  <span className="w-14 shrink-0 overflow-hidden rounded-lg bg-creme ring-1 ring-or-clair/40">
                    <DessinPlan plan={p.contenu} cotes={false} className="h-auto w-full" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{p.nom}</span>
                    <span className="block text-xs text-encre-doux">
                      {p.role === "proprietaire" ? "Votre plan" : "Partagé avec vous : les mariés devront accepter"}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function DemandeEnvoyeeInfo({ mariage, onFermer }: { mariage: Mariage; onFermer: () => void }) {
  const sujet = "Notre plan de salle";
  const corps =
    `Bonjour ${nomMariage(mariage)},\n\n` +
    "J'ai demandé à relier votre plan de salle à l'organisation de votre mariage, pour pouvoir le transmettre à vos prestataires.\n\n" +
    "Pour accepter : ouvrez Mon plan de salle, allez dans « Mes plans » et appuyez sur « Accepter ».\n" +
    "Vous gardez bien sûr tous vos droits sur votre plan.\n\nÀ très vite !";
  return (
    <div className="flex flex-col gap-4">
      <p>
        Les mariés doivent maintenant accepter : la demande apparaît en haut de leur page « Mes plans ». Dès qu&apos;ils
        acceptent, le plan s&apos;affiche ici, toujours dans sa dernière version.
      </p>
      <a
        href={`mailto:?subject=${encodeURIComponent(sujet)}&body=${encodeURIComponent(corps)}`}
        className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-or px-6 font-medium text-blanc"
      >
        ✉️ Prévenir les mariés par e-mail
      </a>
      <Bouton variante="secondaire" onClick={onFermer}>
        Fermer
      </Bouton>
    </div>
  );
}

function ActionsPlan({ plan, onOuvrir, onDetache }: { plan: Plan; onOuvrir: (suite: string) => void; onDetache: () => void }) {
  const [confirmer, setConfirmer] = useState(false);
  const [erreur, setErreur] = useState("");
  const ligne = "flex min-h-[52px] w-full items-center rounded-2xl bg-blanc px-4 text-left ring-1 ring-or-clair/60";
  return (
    <div className="flex flex-col gap-2">
      <button type="button" className={ligne} onClick={() => onOuvrir("")}>🪑 Ouvrir le plan</button>
      {plan.role === "proprietaire" && (
        <button type="button" className={ligne} onClick={() => onOuvrir("&partage=1")}>👥 Partager avec les mariés</button>
      )}
      <a className={ligne} href={`/plans/${plan.id}/imprimer`}>🖨 Imprimer / PDF</a>
      {!confirmer ? (
        <button type="button" className={`${ligne} text-alerte`} onClick={() => setConfirmer(true)}>
          Retirer ce plan du mariage
        </button>
      ) : (
        <Carte className="flex flex-col gap-2">
          <p className="text-sm">
            Le plan ne sera plus affiché dans ce mariage. Il n&apos;est pas supprimé : on le retrouve dans « Mes plans ».
          </p>
          {erreur && <p className="text-sm text-alerte">{erreur}</p>}
          <Bouton
            variante="danger"
            onClick={async () => {
              try {
                await detacherPlan(plan.id);
                onDetache();
              } catch (e) {
                setErreur(messageErreur(e as Error));
              }
            }}
          >
            Retirer du mariage
          </Bouton>
          <Bouton variante="secondaire" onClick={() => setConfirmer(false)}>Annuler</Bouton>
        </Carte>
      )}
    </div>
  );
}
