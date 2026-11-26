"use client";
import { useState } from "react";
import { Bouton, Carte, Champ, Chargement, EnTetePage, MessageErreur, Pastille, TON_STATUT, Vide } from "@/components/ui";
import { exiger, useDonnees, useEspace } from "@/lib/espace";
import { supabaseNavigateur } from "@/lib/supabase/navigateur";
import { statutEtape, type Statut } from "@/lib/calculs";
import { messageErreur } from "@/lib/erreurs";
import type { Etape } from "@/lib/types";

const STATUTS: Statut[] = ["termine", "en_cours", "pas_commence"];
const CLASSE_STATUT: Record<Statut, string> = {
  termine: "bg-vert-pale text-vert",
  en_cours: "bg-orange-pale text-orange",
  pas_commence: "bg-rouge-pale text-rouge",
};

export function chargerEtapes(coupleId: string) {
  return exiger(supabaseNavigateur().from("etapes").select("*").eq("couple_id", coupleId).order("ordre").order("cree_le")) as Promise<Etape[]>;
}

// Étapes principales avec leurs sous-étapes et leur statut calculé
export function organiserEtapes(etapes: Etape[]) {
  return etapes
    .filter((e) => !e.parent_id)
    .map((e) => {
      const sous = etapes.filter((s) => s.parent_id === e.id);
      return { ...e, sous, statutCalcule: statutEtape(e.statut, sous.map((s) => s.statut)) };
    });
}

export function Retroplanning() {
  const { couple, droits, t, langue } = useEspace();
  const { donnees, erreur, recharger } = useDonnees(() => chargerEtapes(couple.id), [couple.id]);
  const [ouverte, setOuverte] = useState<string | null>(null);
  const [edition, setEdition] = useState(false);
  const [nouvelle, setNouvelle] = useState("");
  const [erreurAction, setErreurAction] = useState("");
  const tp = t.planning;

  async function agir(action: () => PromiseLike<{ error: { message: string; code?: string } | null }>) {
    setErreurAction("");
    const { error } = await action();
    if (error) setErreurAction(messageErreur(error, langue));
    await recharger();
  }
  const sb = () => supabaseNavigateur().from("etapes");

  if (!donnees) return <><EnTetePage titre={tp.titre} /><MessageErreur>{erreur}</MessageErreur>{!erreur && <Chargement texte={t.chargement} />}</>;
  const etapes = organiserEtapes(donnees);
  const maxOrdre = Math.max(0, ...donnees.map((e) => e.ordre));

  return (
    <>
      <EnTetePage
        titre={tp.titre}
        intro={droits.editer ? tp.intro : `${tp.intro} ${t.lectureSeule}`}
        action={droits.editer && etapes.length > 0 && (
          <Bouton variante={edition ? "principal" : "contour"} onClick={() => setEdition(!edition)}>{edition ? t.enregistre : t.modifier}</Bouton>
        )}
      />
      <MessageErreur>{erreurAction}</MessageErreur>
      {etapes.length === 0 && <Vide>{tp.vide}</Vide>}

      <Carte className="px-4 py-1.5 sm:px-5">
        <ul>
          {etapes.map((e, i) => {
            const aSous = e.sous.length > 0;
            const estOuverte = aSous && (ouverte === e.id || edition);
            const faites = e.sous.filter((s) => s.statut === "termine").length;
            return (
              <li key={e.id} className="border-b border-trait-fin last:border-none">
                <div className="flex min-h-14 items-center gap-3 py-2.5">
                  {edition ? (
                    <LigneEdition
                      nom={e.nom}
                      onRenommer={(nom) => agir(() => sb().update({ nom }).eq("id", e.id))}
                      onSupprimer={() => agir(() => sb().delete().eq("id", e.id))}
                      onMonter={i > 0 ? () => echanger(e, etapes[i - 1]) : undefined}
                      t={t}
                    />
                  ) : (
                    <button
                      type="button"
                      disabled={!aSous}
                      onClick={() => setOuverte(estOuverte ? null : e.id)}
                      aria-expanded={aSous ? estOuverte : undefined}
                      className="flex flex-1 items-center gap-3 text-left disabled:cursor-default"
                    >
                      <span className="flex flex-1 flex-col">
                        <span className="text-[15px] font-medium">{e.nom}</span>
                        {aSous && <span className="text-xs text-doux">{tp.sousEtapes(faites, e.sous.length)}</span>}
                      </span>
                      {aSous && <span aria-hidden className="w-4 text-center text-lg text-bordeaux">{estOuverte ? "−" : "+"}</span>}
                    </button>
                  )}
                  {droits.editer && !aSous ? (
                    <ChoixStatut valeur={e.statut} onChange={(statut) => agir(() => sb().update({ statut }).eq("id", e.id))} t={t} />
                  ) : (
                    <Pastille ton={TON_STATUT[e.statutCalcule]}>{t.statuts[e.statutCalcule]}</Pastille>
                  )}
                </div>
                {estOuverte && (
                  <ul className="mb-3 ml-1 flex flex-col gap-1 border-l-2 border-piste pl-3">
                    {e.sous.map((s) => (
                      <li key={s.id} className="flex min-h-11 items-center gap-3">
                        {edition ? (
                          <LigneEdition nom={s.nom} t={t}
                            onRenommer={(nom) => agir(() => sb().update({ nom }).eq("id", s.id))}
                            onSupprimer={() => agir(() => sb().delete().eq("id", s.id))} />
                        ) : (
                          <span className="flex-1 text-sm">{s.nom}</span>
                        )}
                        {droits.editer ? (
                          <ChoixStatut valeur={s.statut} onChange={(statut) => agir(() => sb().update({ statut }).eq("id", s.id))} t={t} />
                        ) : (
                          <Pastille ton={TON_STATUT[s.statut]}>{t.statuts[s.statut]}</Pastille>
                        )}
                      </li>
                    ))}
                    {droits.editer && (
                      <AjoutSousEtape t={t} onAjouter={(nom) =>
                        agir(() => sb().insert({ couple_id: couple.id, parent_id: e.id, nom, ordre: Math.max(0, ...e.sous.map((s) => s.ordre)) + 1 }))} />
                    )}
                    {!droits.editer && <li className="text-xs text-doux">{tp.statutAuto}</li>}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </Carte>

      {droits.editer && (
        <Carte className="mt-4">
          <form className="flex flex-col gap-3 sm:flex-row sm:items-end"
            onSubmit={(ev) => {
              ev.preventDefault();
              const nom = nouvelle.trim();
              if (!nom) return;
              setNouvelle("");
              agir(() => sb().insert({ couple_id: couple.id, nom, ordre: maxOrdre + 1 }));
            }}>
            <Champ id="nouvelle-etape" libelle={tp.nomEtape} aide={tp.nomEtapeAide} value={nouvelle} onChange={(ev) => setNouvelle(ev.target.value)} maxLength={120} className="flex-1" />
            <Bouton type="submit" className="sm:mb-5">{tp.ajouterEtape}</Bouton>
          </form>
        </Carte>
      )}
    </>
  );

  async function echanger(a: Etape, b: Etape) {
    await agir(() => sb().update({ ordre: b.ordre }).eq("id", a.id));
    await agir(() => sb().update({ ordre: a.ordre === b.ordre ? a.ordre + 1 : a.ordre }).eq("id", b.id));
  }
}

function ChoixStatut({ valeur, onChange, t }: { valeur: Statut; onChange: (s: Statut) => void; t: ReturnType<typeof useEspace>["t"] }) {
  return (
    <select
      aria-label={t.planning.titre}
      value={valeur}
      onChange={(e) => onChange(e.target.value as Statut)}
      className={`min-h-8 cursor-pointer appearance-none rounded-full border-none px-3 py-1 text-center text-[11px] font-semibold ${CLASSE_STATUT[valeur]}`}
    >
      {STATUTS.map((s) => <option key={s} value={s}>{t.statuts[s]}</option>)}
    </select>
  );
}

function LigneEdition({ nom, onRenommer, onSupprimer, onMonter, t }: {
  nom: string; onRenommer: (nom: string) => void; onSupprimer: () => void; onMonter?: () => void; t: ReturnType<typeof useEspace>["t"];
}) {
  const [valeur, setValeur] = useState(nom);
  return (
    <span className="flex flex-1 flex-wrap items-center gap-2">
      <input
        aria-label={t.modifier}
        value={valeur}
        maxLength={120}
        onChange={(e) => setValeur(e.target.value)}
        onBlur={() => valeur.trim() && valeur !== nom && onRenommer(valeur.trim())}
        className="min-h-10 min-w-0 flex-1 rounded-[10px] border border-champ bg-white px-2.5 text-sm"
      />
      {onMonter && <button type="button" onClick={onMonter} aria-label="Monter" className="flex size-10 items-center justify-center rounded-[10px] border border-champ bg-white text-bordeaux">↑</button>}
      <button type="button" onClick={() => confirm(t.confirmerSuppression) && onSupprimer()} className="min-h-10 rounded-[10px] border border-champ bg-white px-3 text-xs font-medium text-rouge">
        {t.supprimer}
      </button>
    </span>
  );
}

function AjoutSousEtape({ onAjouter, t }: { onAjouter: (nom: string) => void; t: ReturnType<typeof useEspace>["t"] }) {
  const [ouvert, setOuvert] = useState(false);
  const [nom, setNom] = useState("");
  if (!ouvert)
    return (
      <li>
        <button type="button" onClick={() => setOuvert(true)} className="min-h-10 text-sm font-semibold text-bordeaux">+ {t.planning.ajouterSousEtape}</button>
      </li>
    );
  return (
    <li>
      <form className="flex gap-2 py-1" onSubmit={(e) => { e.preventDefault(); if (nom.trim()) { onAjouter(nom.trim()); setNom(""); setOuvert(false); } }}>
        <input autoFocus aria-label={t.planning.nomSousEtape} placeholder={t.planning.nomSousEtape} value={nom} maxLength={120} onChange={(e) => setNom(e.target.value)}
          className="min-h-10 min-w-0 flex-1 rounded-[10px] border border-champ bg-white px-2.5 text-sm" />
        <Bouton type="submit" className="min-h-10">{t.ajouter}</Bouton>
      </form>
    </li>
  );
}
