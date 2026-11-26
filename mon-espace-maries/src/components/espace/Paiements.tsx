"use client";
import { useState } from "react";
import { Bouton, Carte, Champ, Chargement, EnTetePage, MessageErreur, Pastille, Vide, type Ton } from "@/components/ui";
import { exiger, useDonnees, useEspace } from "@/lib/espace";
import { supabaseNavigateur } from "@/lib/supabase/navigateur";
import { ajouterMois, aujourdhuiParis, centimes, formatDate, formatEuros, prochaineEcheance, soldeTropTard, totauxPaiements } from "@/lib/calculs";
import { messageErreur } from "@/lib/erreurs";
import { notifierServeur } from "@/lib/notifier";
import type { Echeance, StatutEcheance } from "@/lib/types";

export const TON_ECHEANCE: Record<StatutEcheance, Ton> = { paye: "vert", a_venir: "neutre", a_confirmer: "orange" };

export function chargerEcheances(coupleId: string) {
  return exiger(supabaseNavigateur().from("echeances").select("*").eq("couple_id", coupleId).order("ordre").order("date_prevue")) as Promise<Echeance[]>;
}

export function Paiements() {
  const { couple, droits, t, langue } = useEspace();
  const { donnees, erreur, recharger } = useDonnees(() => chargerEcheances(couple.id), [couple.id]);
  const [erreurAction, setErreurAction] = useState("");
  const tp = t.paiements;

  async function agir(action: () => PromiseLike<{ error: { message: string; code?: string } | null }>) {
    setErreurAction("");
    const { error } = await action();
    if (error) setErreurAction(messageErreur(error, langue));
    else notifierServeur();
    await recharger();
  }

  if (!donnees) return <><EnTetePage titre={tp.titre} /><MessageErreur>{erreur}</MessageErreur>{!erreur && <Chargement texte={t.chargement} />}</>;
  const totaux = totauxPaiements(donnees);
  const prochaine = prochaineEcheance(donnees);

  return (
    <>
      <EnTetePage titre={tp.titre} intro={tp.intro} />
      <MessageErreur>{erreurAction}</MessageErreur>
      <div className="mb-4 grid grid-cols-2 gap-3">
        <Carte className="flex flex-col gap-0.5">
          <span className="text-xs text-doux">{tp.regle}</span>
          <span className="font-titre text-[26px] font-semibold leading-tight text-vert">{formatEuros(totaux.regle, langue)}</span>
        </Carte>
        <Carte className="flex flex-col gap-0.5">
          <span className="text-xs text-doux">{tp.reste}</span>
          <span className="font-titre text-[26px] font-semibold leading-tight text-bordeaux">{formatEuros(totaux.reste, langue)}</span>
        </Carte>
      </div>

      {droits.admin && soldeTropTard(donnees, couple.date_mariage) && (
        <p role="alert" className="mb-4 rounded-xl bg-orange-pale px-3 py-2 text-sm text-orange">
          Attention : le solde tombe moins d&apos;un mois avant le mariage (au plus tard le {formatDate(ajouterMois(couple.date_mariage, -1))}).
        </p>
      )}

      {donnees.length === 0 && <Vide>{tp.vide}</Vide>}
      <div className="flex flex-col gap-3">
        {donnees.map((e) =>
          droits.admin ? (
            <EcheanceAdmin key={e.id} e={e} agir={agir} />
          ) : (
            <Carte key={e.id} className="flex flex-col gap-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[15px] font-semibold">{e.libelle}</span>
                  <span className="text-xs text-doux">
                    {e.statut === "paye" && e.paye_le ? tp.payeLe(formatDate(e.paye_le, langue)) : e.date_prevue ? tp.prevuLe(formatDate(e.date_prevue, langue)) : ""}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="font-titre text-xl font-semibold">{formatEuros(centimes(e.montant), langue)}</span>
                  <Pastille ton={TON_ECHEANCE[e.statut]}>{tp.statuts[e.statut]}</Pastille>
                </div>
              </div>
              {prochaine?.id === e.id && e.statut === "a_venir" && (
                <div className="flex flex-col gap-1.5 border-t border-trait-fin pt-3">
                  <Bouton onClick={() => agir(() => supabaseNavigateur().rpc("declarer_virement", { p_echeance: e.id }))}>{tp.declare}</Bouton>
                  <span className="text-center text-xs text-doux">{tp.declareAide}</span>
                </div>
              )}
              {e.statut === "a_confirmer" && <p className="rounded-lg bg-orange-pale px-3 py-2 text-xs text-orange">{tp.enAttente}</p>}
            </Carte>
          ),
        )}
      </div>

      {droits.admin && donnees.length < 6 && (
        <NouvelleEcheance
          numero={donnees.length + 1}
          onAjouter={(v) => agir(() => supabaseNavigateur().from("echeances").insert({ couple_id: couple.id, ...v, ordre: Math.max(0, ...donnees.map((x) => x.ordre)) + 1 }))}
        />
      )}
      {droits.admin && donnees.length >= 6 && <p className="mt-3 text-xs text-doux">6 versements au maximum.</p>}
    </>
  );
}

type Agir = (action: () => PromiseLike<{ error: { message: string; code?: string } | null }>) => Promise<void>;

// Laura : montant, date, payé (avec la date), suppression
function EcheanceAdmin({ e, agir }: { e: Echeance; agir: Agir }) {
  const [libelle, setLibelle] = useState(e.libelle);
  const [montant, setMontant] = useState(String(e.montant).replace(".", ","));
  const [date, setDate] = useState(e.date_prevue ?? "");
  const [payeLe, setPayeLe] = useState(e.paye_le ?? aujourdhuiParis());
  const sb = () => supabaseNavigateur().from("echeances");
  const modifie = libelle !== e.libelle || centimes(montant) !== centimes(e.montant) || date !== (e.date_prevue ?? "");

  return (
    <Carte className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Pastille ton={TON_ECHEANCE[e.statut]}>{e.statut === "paye" ? "Payé" : e.statut === "a_confirmer" ? "Virement déclaré : à confirmer" : "À venir"}</Pastille>
        {e.statut === "paye" && e.paye_le && <span className="text-xs text-doux">Payé le {formatDate(e.paye_le)}</span>}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[2fr_1fr_1fr]">
        <Champ id={`lib-${e.id}`} libelle="Libellé" value={libelle} onChange={(x) => setLibelle(x.target.value)} maxLength={120} />
        <Champ id={`mt-${e.id}`} libelle="Montant (€)" inputMode="decimal" value={montant} onChange={(x) => setMontant(x.target.value)} />
        <Champ id={`dt-${e.id}`} libelle="Date prévue" type="date" value={date} onChange={(x) => setDate(x.target.value)} />
      </div>
      <div className="flex flex-wrap items-end gap-2">
        {modifie && (
          <Bouton onClick={() => agir(() => sb().update({ libelle: libelle.trim(), montant: (centimes(montant) ?? 0) / 100, date_prevue: date || null }).eq("id", e.id))}>Enregistrer</Bouton>
        )}
        {e.statut !== "paye" ? (
          <>
            <Champ id={`pl-${e.id}`} libelle="Payé le" type="date" value={payeLe} onChange={(x) => setPayeLe(x.target.value)} className="w-40" />
            <Bouton variante="contour" onClick={() => agir(() => sb().update({ statut: "paye", paye_le: payeLe || aujourdhuiParis() }).eq("id", e.id))}>Marquer payé</Bouton>
          </>
        ) : (
          <Bouton variante="secondaire" onClick={() => agir(() => sb().update({ statut: "a_venir", paye_le: null, declare_le: null }).eq("id", e.id))}>Annuler « payé »</Bouton>
        )}
        <Bouton variante="danger" className="ml-auto" onClick={() => confirm("Supprimer cette échéance ?") && agir(() => sb().delete().eq("id", e.id))}>Supprimer</Bouton>
      </div>
    </Carte>
  );
}

function NouvelleEcheance({ numero, onAjouter }: { numero: number; onAjouter: (v: { libelle: string; montant: number; date_prevue: string | null }) => void }) {
  const [libelle, setLibelle] = useState(numero === 1 ? "Acompte à la signature" : `${numero}e versement`);
  const [montant, setMontant] = useState("");
  const [date, setDate] = useState("");
  return (
    <Carte className="mt-4">
      <form className="grid grid-cols-1 gap-3 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end" onSubmit={(e) => {
        e.preventDefault();
        const c = centimes(montant);
        if (!libelle.trim() || c === null) return;
        onAjouter({ libelle: libelle.trim(), montant: c / 100, date_prevue: date || null });
        setMontant("");
        setDate("");
        setLibelle(`${numero + 1}e versement`);
      }}>
        <Champ id="ne-lib" libelle="Nouvelle échéance" value={libelle} onChange={(e) => setLibelle(e.target.value)} maxLength={120} />
        <Champ id="ne-mt" libelle="Montant (€)" inputMode="decimal" value={montant} onChange={(e) => setMontant(e.target.value)} required />
        <Champ id="ne-dt" libelle="Date prévue" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <Bouton type="submit">Ajouter</Bouton>
      </form>
    </Carte>
  );
}
