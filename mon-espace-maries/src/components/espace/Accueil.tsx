"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import { BarreProgression, Carte, Chargement, Icones, MessageErreur, Pastille, TON_STATUT } from "@/components/ui";
import { exiger, useDonnees, useEspace } from "@/lib/espace";
import { supabaseNavigateur } from "@/lib/supabase/navigateur";
import { albumOuvert, avancement, centimes, formatDate, formatEuros, joursAvant, prochaineEcheance } from "@/lib/calculs";
import { chargerEtapes, organiserEtapes } from "./Retroplanning";
import { chargerEcheances, TON_ECHEANCE } from "./Paiements";
import type { Reglages } from "@/lib/types";
import type { Dictionnaire } from "@/lib/i18n";

const TUILES: { partie: string; texte: (t: Dictionnaire) => string; icone: (c?: string) => ReactNode }[] = [
  { partie: "a-faire", texte: (t) => t.nav.aFaire, icone: Icones.aFaire },
  { partie: "rendez-vous", texte: (t) => t.nav.rendezVous, icone: Icones.rdv },
  { partie: "deroule", texte: (t) => t.nav.deroule, icone: Icones.deroule },
  { partie: "paiements", texte: (t) => t.nav.paiements, icone: Icones.paiements },
  { partie: "questionnaire", texte: (t) => t.nav.questionnaire, icone: Icones.questionnaire },
  { partie: "prestataires", texte: (t) => t.nav.prestataires, icone: Icones.prestataires },
  { partie: "proches", texte: (t) => t.nav.proches, icone: Icones.proches },
  { partie: "documents", texte: (t) => t.nav.documents, icone: Icones.documents },
  { partie: "planning", texte: (t) => t.nav.retroplanning, icone: Icones.planning },
  { partie: "album", texte: (t) => t.nav.album, icone: Icones.album },
];

export function Accueil() {
  const { couple, t, langue, lien } = useEspace();
  const ta = t.accueil;
  const { donnees, erreur } = useDonnees(
    () => Promise.all([
      chargerEtapes(couple.id),
      chargerEcheances(couple.id),
      exiger(supabaseNavigateur().from("reglages").select("lien_avis_google, lien_avis_mariagesnet").eq("id", 1).maybeSingle()) as Promise<Reglages | null>,
    ]),
    [couple.id],
  );

  if (!donnees) return <><MessageErreur>{erreur}</MessageErreur>{!erreur && <Chargement texte={t.chargement} />}</>;
  const [etapesBrutes, echeances, reglages] = donnees;
  const etapes = organiserEtapes(etapesBrutes);
  const faites = etapes.filter((e) => e.statutCalcule === "termine").length;
  const pct = avancement(etapes.map((e) => e.statutCalcule));
  const prochaine = etapes.find((e) => e.statutCalcule !== "termine");
  const paiement = prochaineEcheance(echeances);
  const j = joursAvant(couple.date_mariage);
  const apres = albumOuvert(couple.date_mariage);

  return (
    <div className="flex flex-col gap-4">
      {apres ? (
        <Carte className="flex flex-col gap-3 border-bordeaux bg-bordeaux p-5 text-fond">
          <span className="text-fond">{Icones.coeur("size-8")}</span>
          <h1 className="font-titre text-[30px] font-semibold leading-tight">{ta.merciTitre}</h1>
          <p className="text-sm leading-relaxed opacity-90">{ta.merciTexte}</p>
          {(reglages?.lien_avis_mariagesnet || reglages?.lien_avis_google) && (
            <>
              <p className="text-sm font-semibold">{ta.avisTexte}</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                {reglages.lien_avis_mariagesnet && (
                  <a href={reglages.lien_avis_mariagesnet} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-fond px-4 text-sm font-semibold text-bordeaux">{ta.avisMariagesNet}</a>
                )}
                {reglages.lien_avis_google && (
                  <a href={reglages.lien_avis_google} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center justify-center rounded-xl border-[1.5px] border-fond px-4 text-sm font-semibold text-fond">{ta.avisGoogle}</a>
                )}
              </div>
            </>
          )}
          <Link href={lien("album")} className="text-sm font-semibold underline underline-offset-4">{t.nav.album} ›</Link>
        </Carte>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Carte className="flex flex-col justify-center gap-1 border-bordeaux bg-bordeaux p-5 text-fond">
            {j >= 0 ? (
              <>
                <span className="font-titre text-5xl font-semibold leading-none">{ta.avant(j)}</span>
                {j > 1 && <span className="text-sm opacity-90">{ta.avantSous}</span>}
              </>
            ) : <span className="font-titre text-3xl font-semibold">{ta.joyeux}</span>}
            <span className="mt-1 text-xs opacity-80">{formatDate(couple.date_mariage, langue, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>
          </Carte>
          <Carte className="flex flex-col justify-center gap-2.5">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-semibold">{ta.avancement}</span>
              <span className="font-titre text-3xl font-semibold text-bordeaux">{pct} %</span>
            </div>
            <BarreProgression pourcentage={pct} />
            <span className="text-xs text-doux">{ta.etapesTerminees(faites, etapes.length)}</span>
          </Carte>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Link href={lien("planning")}>
          <Carte className="flex h-full flex-col gap-1.5 hover:border-bordeaux">
            <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-bordeaux">{ta.prochaineEtape}</span>
            {prochaine ? (
              <span className="flex items-center justify-between gap-2">
                <span className="text-[15px] font-semibold">{prochaine.nom}</span>
                <Pastille ton={TON_STATUT[prochaine.statutCalcule]}>{t.statuts[prochaine.statutCalcule]}</Pastille>
              </span>
            ) : <span className="text-sm text-doux">{ta.toutTermine}</span>}
          </Carte>
        </Link>
        <Link href={lien("paiements")}>
          <Carte className="flex h-full flex-col gap-1.5 hover:border-bordeaux">
            <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-bordeaux">{ta.prochainPaiement}</span>
            {paiement ? (
              <span className="flex items-center justify-between gap-2">
                <span className="flex flex-col">
                  <span className="text-[15px] font-semibold">{formatEuros(centimes(paiement.montant), langue)}</span>
                  <span className="text-xs text-doux">{paiement.libelle}{paiement.date_prevue ? ` · ${formatDate(paiement.date_prevue, langue)}` : ""}</span>
                </span>
                <Pastille ton={TON_ECHEANCE[paiement.statut]}>{t.paiements.statuts[paiement.statut]}</Pastille>
              </span>
            ) : <span className="text-sm text-doux">{ta.aucunPaiement}</span>}
          </Carte>
        </Link>
      </div>

      <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
        {TUILES.map((tu) => (
          <li key={tu.partie}>
            <Link href={lien(tu.partie)} className="flex min-h-24 flex-col justify-between gap-2 rounded-2xl border border-trait bg-carte p-3.5 text-encre hover:border-bordeaux">
              <span className="text-bordeaux">{tu.icone()}</span>
              <span className="text-sm font-semibold leading-tight">{tu.texte(t)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
