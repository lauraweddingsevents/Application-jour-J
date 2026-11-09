"use client";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { Bouton } from "@/components/ui/Bouton";
import { Carte } from "@/components/ui/Carte";
import { Feuille } from "@/components/ui/Feuille";
import { FormulaireRetard } from "@/components/retard/FormulaireRetard";
import { supabaseNavigateur } from "@/lib/supabase/navigateur";
import {
  creerMoment,
  decalerMoments,
  listerIntervenants,
  listerMoments,
  modifierMoment,
  supprimerMoment,
} from "@/lib/donnees";
import { messageErreur } from "@/lib/erreurs";
import { dureeLisible, estApresMinuit, heureAffichee, heureSaisie, minutesEntre } from "@/lib/heures";
import { echangerMoments } from "@/lib/reorganiser";
import { trierMoments, type Intervenant, type Mariage, type Moment } from "@/lib/types";
import { FormulaireMoment } from "./FormulaireMoment";

export function Deroule({ mariage }: { mariage: Mariage }) {
  const tz = mariage.fuseau_horaire;
  const [moments, setMoments] = useState<Moment[] | null>(null);
  const [intervenants, setIntervenants] = useState<Intervenant[]>([]);
  const [erreur, setErreur] = useState("");
  const [edition, setEdition] = useState<Moment | "nouveau" | null>(null);
  const [reorganiser, setReorganiser] = useState(false);
  const [occupe, setOccupe] = useState(false);
  const [retard, setRetard] = useState<Moment | null>(null);
  const [annonce, setAnnonce] = useState("");
  const fermer = useCallback(() => setEdition(null), []);
  const fermerRetard = useCallback(() => setRetard(null), []);

  const charger = useCallback(
    () =>
      Promise.all([listerMoments(mariage.id), listerIntervenants(mariage.id)])
        .then(([m, i]) => {
          setMoments(trierMoments(m));
          setIntervenants(i);
        })
        .catch((e) => setErreur(messageErreur(e))),
    [mariage.id],
  );
  useEffect(() => {
    charger();
  }, [charger]);

  // Mises à jour en direct (par exemple un retard signalé par un témoin coordinateur)
  useEffect(() => {
    let minuterie: ReturnType<typeof setTimeout> | undefined;
    const supabase = supabaseNavigateur();
    const abonnement = supabase
      .channel(`mariage:${mariage.canal}`)
      .on("broadcast", { event: "maj" }, () => {
        clearTimeout(minuterie);
        minuterie = setTimeout(charger, 400);
      })
      .subscribe();
    return () => {
      clearTimeout(minuterie);
      supabase.removeChannel(abonnement);
    };
  }, [mariage.canal, charger]);

  const parId = useMemo(() => new Map(intervenants.map((i) => [i.id, i])), [intervenants]);
  const lieuxConnus = useMemo(() => {
    const l = new Set<string>();
    if (mariage.lieu_principal) l.add(mariage.lieu_principal);
    moments?.forEach((m) => m.lieu && l.add(m.lieu));
    return [...l];
  }, [moments, mariage.lieu_principal]);

  // Heure proposée pour un nouveau moment : la fin du dernier moment
  const dernier = moments?.at(-1);
  const heureProposee = dernier ? heureSaisie(dernier.fin ?? dernier.debut, tz) : "14:00";

  async function deplacer(index: number, sens: -1 | 1) {
    if (!moments) return;
    const iAvant = sens === -1 ? index - 1 : index;
    const avant = moments[iAvant];
    const apres = moments[iAvant + 1];
    if (!avant || !apres) return;
    const [nAvant, nApres] = echangerMoments(avant, apres);
    setOccupe(true);
    try {
      await Promise.all([modifierMoment(avant.id, nAvant), modifierMoment(apres.id, nApres)]);
      await charger();
    } catch (e) {
      setErreur(messageErreur(e as Error));
    } finally {
      setOccupe(false);
    }
  }

  return (
    <div>
      <Bouton className="w-full" onClick={() => setEdition("nouveau")} disabled={reorganiser}>
        <span aria-hidden className="text-xl leading-none">+</span> Ajouter un moment
      </Bouton>
      {moments && moments.length > 1 && (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={() => setReorganiser((r) => !r)}
            aria-pressed={reorganiser}
            className={`min-h-[44px] rounded-full px-4 text-sm font-medium ${
              reorganiser ? "bg-encre text-blanc" : "bg-blanc text-or-fonce ring-1 ring-or-clair"
            }`}
          >
            {reorganiser ? "✓ Terminé" : "⇅ Réordonner"}
          </button>
        </div>
      )}
      {reorganiser && (
        <p className="mt-3 text-sm text-encre-doux">
          Utilisez les flèches pour échanger deux moments : chacun garde sa durée
          et les horaires s&apos;ajustent.
        </p>
      )}

      {annonce && (
        <p className="mt-4 rounded-2xl bg-succes/15 px-4 py-3 text-sm text-succes" role="status">
          {annonce}
        </p>
      )}
      {erreur && <p className="mt-4 text-alerte">{erreur}</p>}
      {moments === null && !erreur && <p className="mt-8 text-center text-encre-doux">Chargement…</p>}
      {moments?.length === 0 && (
        <Carte className="mt-4 text-center">
          <p className="text-3xl" aria-hidden>🕰️</p>
          <p className="mt-2 text-encre-doux">
            Ajoutez le premier moment de la journée : préparatifs, cérémonie, cocktail…
          </p>
        </Carte>
      )}

      <ol className="mt-5 flex flex-col gap-2">
        {moments?.map((m, index) => {
          const nuit = estApresMinuit(m.debut, mariage.date_mariage, tz);
          const nuitAvant = index > 0 && estApresMinuit(moments[index - 1].debut, mariage.date_mariage, tz);
          return (
            <Fragment key={m.id}>
              {nuit && !nuitAvant && (
                <li className="my-2 flex items-center gap-3 text-xs font-medium uppercase tracking-wider text-encre-doux">
                  <span className="h-px flex-1 bg-or-clair" /> 🌙 Après minuit <span className="h-px flex-1 bg-or-clair" />
                </li>
              )}
              <li className="flex items-stretch gap-2">
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left disabled:cursor-default"
                  onClick={() => setEdition(m)}
                  disabled={reorganiser}
                >
                  <CarteMoment moment={m} tz={tz} parId={parId} />
                </button>
                {!reorganiser && (
                  <button
                    type="button"
                    onClick={() => setRetard(m)}
                    aria-label={`Retard sur « ${m.titre} »`}
                    className="flex w-14 shrink-0 flex-col items-center justify-center gap-0.5 rounded-carte bg-blanc text-[11px] font-medium text-or-fonce ring-1 ring-or-clair/60"
                  >
                    <span aria-hidden className="text-lg">⏱</span>
                    Retard
                  </button>
                )}
                {reorganiser && (
                  <div className="flex flex-col justify-center gap-1">
                    <BoutonFleche
                      libelle={`Monter « ${m.titre} »`}
                      onClick={() => deplacer(index, -1)}
                      disabled={occupe || index === 0}
                    >
                      ↑
                    </BoutonFleche>
                    <BoutonFleche
                      libelle={`Descendre « ${m.titre} »`}
                      onClick={() => deplacer(index, 1)}
                      disabled={occupe || index === moments.length - 1}
                    >
                      ↓
                    </BoutonFleche>
                  </div>
                )}
              </li>
            </Fragment>
          );
        })}
      </ol>

      <Feuille titre="Signaler un retard" ouverte={retard !== null} onFermer={fermerRetard}>
        {retard && moments && (
          <FormulaireRetard
            moment={retard}
            moments={moments}
            tz={tz}
            onValider={async (minutes, suivants) => {
              const n = await decalerMoments(retard.id, minutes, suivants);
              await charger();
              fermerRetard();
              setAnnonce(`✓ ${n} moment${n > 1 ? "s" : ""} décalé${n > 1 ? "s" : ""}. Les intervenants voient déjà les nouveaux horaires.`);
              setTimeout(() => setAnnonce(""), 6000);
            }}
          />
        )}
      </Feuille>

      <Feuille
        titre={edition === "nouveau" ? "Nouveau moment" : "Modifier le moment"}
        ouverte={edition !== null}
        onFermer={fermer}
      >
        {edition !== null && (
          <FormulaireMoment
            key={edition === "nouveau" ? "nouveau" : edition.id}
            mariage={mariage}
            intervenants={intervenants}
            lieuxConnus={lieuxConnus}
            initial={edition === "nouveau" ? undefined : edition}
            heureProposee={heureProposee}
            onEnregistrer={async (saisie) => {
              if (edition === "nouveau") await creerMoment(mariage.id, saisie, moments?.length ?? 0);
              else await modifierMoment(edition.id, saisie);
              await charger();
              fermer();
            }}
            onSupprimer={
              edition === "nouveau"
                ? undefined
                : async () => {
                    await supprimerMoment(edition.id);
                    await charger();
                    fermer();
                  }
            }
          />
        )}
      </Feuille>
    </div>
  );
}

function BoutonFleche({
  libelle,
  children,
  ...props
}: React.ComponentProps<"button"> & { libelle: string }) {
  return (
    <button
      type="button"
      aria-label={libelle}
      className="flex h-11 w-11 items-center justify-center rounded-full bg-blanc text-lg text-or-fonce ring-1 ring-or-clair disabled:opacity-30"
      {...props}
    >
      {children}
    </button>
  );
}

export function CarteMoment({
  moment,
  tz,
  parId,
}: {
  moment: Moment;
  tz: string;
  parId: Map<string, Intervenant>;
}) {
  const noms = moment.intervenants.map((id) => parId.get(id)?.nom).filter(Boolean);
  return (
    <Carte className="flex gap-4 py-4">
      <div className="w-14 shrink-0 text-right">
        <p className="text-lg font-medium leading-tight">{heureAffichee(moment.debut, tz)}</p>
        {moment.fin && (
          <p className="text-xs text-encre-doux">
            {heureAffichee(moment.fin, tz)}
            <br />
            {dureeLisible(minutesEntre(moment.debut, moment.fin))}
          </p>
        )}
      </div>
      <div className="min-w-0 flex-1 border-l border-or-clair pl-4">
        <p className="font-medium">{moment.titre}</p>
        {moment.lieu && <p className="mt-0.5 text-sm text-encre-doux">📍 {moment.lieu}</p>}
        {noms.length > 0 && (
          <p className="mt-1.5 flex flex-wrap gap-1">
            {noms.map((n) => (
              <span key={n} className="rounded-full bg-creme px-2.5 py-0.5 text-xs text-or-fonce">
                {n}
              </span>
            ))}
          </p>
        )}
        {moment.notes && (
          <p className="mt-1.5 line-clamp-2 text-sm text-encre-doux">{moment.notes}</p>
        )}
      </div>
    </Carte>
  );
}
