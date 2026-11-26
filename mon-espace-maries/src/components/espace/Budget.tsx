"use client";
import { useState } from "react";
import { Bouton, Carte, Champ, Chargement, EnTetePage, MessageErreur, Vide } from "@/components/ui";
import { exiger, useDonnees, useEspace } from "@/lib/espace";
import { supabaseNavigateur } from "@/lib/supabase/navigateur";
import { centimes, ecart, formatEcart, formatEuros, totauxBudget } from "@/lib/calculs";
import { messageErreur } from "@/lib/erreurs";
import type { PosteBudget } from "@/lib/types";

export function chargerBudget(coupleId: string) {
  return exiger(supabaseNavigateur().from("budget_postes").select("*").eq("couple_id", coupleId).order("ordre").order("nom")) as Promise<PosteBudget[]>;
}

export function Budget() {
  const { couple, droits, t, langue } = useEspace();
  const { donnees, erreur, recharger, setDonnees } = useDonnees(() => chargerBudget(couple.id), [couple.id]);
  const [nom, setNom] = useState("");
  const [erreurAction, setErreurAction] = useState("");
  const tb = t.budget;
  const eur = (c: number | null) => formatEuros(c, langue);

  async function agir(action: () => PromiseLike<{ error: { message: string; code?: string } | null }>) {
    setErreurAction("");
    const { error } = await action();
    if (error) setErreurAction(messageErreur(error, langue));
    await recharger();
  }
  const sb = () => supabaseNavigateur().from("budget_postes");

  if (!donnees) return <><EnTetePage titre={tb.titre} /><MessageErreur>{erreur}</MessageErreur>{!erreur && <Chargement texte={t.chargement} />}</>;
  const totaux = totauxBudget(donnees);

  function modifierMontant(p: PosteBudget, champ: "estime" | "reel", texte: string) {
    const c = centimes(texte);
    const valeur = c === null ? null : c / 100;
    if (valeur === p[champ]) return;
    setDonnees(donnees!.map((x) => (x.id === p.id ? { ...x, [champ]: valeur } : x)));
    agir(() => sb().update({ [champ]: valeur }).eq("id", p.id));
  }

  return (
    <>
      <EnTetePage titre={tb.titre} intro={droits.editer ? tb.intro : `${tb.intro} ${t.lectureSeule}`} />
      <MessageErreur>{erreurAction}</MessageErreur>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <Carte className="flex flex-col gap-0.5">
          <span className="text-xs text-doux">{tb.totalEstime}</span>
          <span className="font-titre text-[26px] font-semibold leading-tight">{eur(totaux.estime)}</span>
        </Carte>
        <Carte accent className="flex flex-col gap-0.5">
          <span className="text-xs opacity-85">{tb.totalReajuste}</span>
          <span className="font-titre text-[26px] font-semibold leading-tight">{eur(totaux.reajuste)}</span>
          <span className="text-[11px] opacity-85">{tb.reajusteAide}</span>
        </Carte>
      </div>

      {donnees.length > 0 && (
        // Téléphone : une ligne par poste, montants en dessous
        <Carte className="px-4 py-1 sm:hidden">
          <ul>
            {donnees.map((p) => {
              const d = ecart(p);
              return (
                <li key={p.id} className="flex flex-col gap-1 border-b border-trait-fin py-2.5 last:border-none">
                  <div className="flex items-center justify-between gap-2">
                    {droits.editer ? (
                      <CelluleTexte valeur={p.nom} libelle={tb.poste} onValider={(v) => agir(() => sb().update({ nom: v }).eq("id", p.id))} />
                    ) : <span className="text-[15px] font-medium">{p.nom}</span>}
                    <span className={`whitespace-nowrap text-sm tabular-nums ${d && d > 0 ? "font-semibold text-rouge" : d && d < 0 ? "font-semibold text-vert" : "text-doux"}`}>
                      {formatEcart(d, langue)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[13px] text-doux">
                    <span className="flex items-center gap-1">{tb.estime}
                      {droits.editer ? <CelluleMontant valeur={p.estime} libelle={`${tb.estime} – ${p.nom}`} onValider={(v) => modifierMontant(p, "estime", v)} /> : <span className="text-encre tabular-nums">{eur(centimes(p.estime))}</span>}
                    </span>
                    <span className="flex items-center gap-1">{tb.reel}
                      {droits.editer ? <CelluleMontant valeur={p.reel} libelle={`${tb.reel} – ${p.nom}`} onValider={(v) => modifierMontant(p, "reel", v)} /> : <span className="text-encre tabular-nums">{eur(centimes(p.reel))}</span>}
                    </span>
                    {droits.editer && (
                      <button type="button" aria-label={`${t.supprimer} ${p.nom}`} onClick={() => confirm(t.confirmerSuppression) && agir(() => sb().delete().eq("id", p.id))}
                        className="ml-auto flex size-9 items-center justify-center rounded-lg text-doux hover:text-rouge">×</button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="flex justify-between border-t border-trait py-3 text-sm font-semibold">
            <span>Total · {tb.ecart}</span>
            <span className={totaux.ecart > 0 ? "text-rouge" : totaux.ecart < 0 ? "text-vert" : ""}>{formatEcart(totaux.ecart, langue)}</span>
          </div>
        </Carte>
      )}
      {donnees.length === 0 ? <Vide>{tb.vide}</Vide> : (
        <Carte className="hidden overflow-x-auto p-0 sm:block sm:p-0">
          <table className="w-full text-[13px] sm:text-sm">
            <thead>
              <tr className="border-b border-trait text-left text-xs text-doux">
                <th scope="col" className="px-3 py-3 font-medium sm:px-4">{tb.poste}</th>
                <th scope="col" className="px-2 py-3 text-right font-medium">{tb.estime}</th>
                <th scope="col" className="px-2 py-3 text-right font-medium">{tb.reel}</th>
                <th scope="col" className="px-3 py-3 text-right font-medium sm:px-4">{tb.ecart}</th>
                {droits.editer && <th scope="col"><span className="sr-only">{t.supprimer}</span></th>}
              </tr>
            </thead>
            <tbody>
              {donnees.map((p) => {
                const d = ecart(p);
                return (
                  <tr key={p.id} className="border-b border-trait-fin last:border-none">
                    <td className="px-3 py-2 sm:px-4">
                      {droits.editer ? (
                        <CelluleTexte valeur={p.nom} libelle={tb.poste} onValider={(v) => agir(() => sb().update({ nom: v }).eq("id", p.id))} />
                      ) : p.nom}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">
                      {droits.editer ? <CelluleMontant valeur={p.estime} libelle={`${tb.estime} – ${p.nom}`} onValider={(v) => modifierMontant(p, "estime", v)} /> : eur(centimes(p.estime))}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">
                      {droits.editer ? <CelluleMontant valeur={p.reel} libelle={`${tb.reel} – ${p.nom}`} onValider={(v) => modifierMontant(p, "reel", v)} /> : eur(centimes(p.reel))}
                    </td>
                    <td className={`whitespace-nowrap px-3 py-2 text-right tabular-nums sm:px-4 ${d && d > 0 ? "font-semibold text-rouge" : d && d < 0 ? "font-semibold text-vert" : "text-doux"}`}>
                      {formatEcart(d, langue)}
                      {d !== null && d !== 0 && <span className="sr-only"> ({d > 0 ? tb.depassement : tb.economie})</span>}
                    </td>
                    {droits.editer && (
                      <td className="pr-2">
                        <button type="button" aria-label={`${t.supprimer} ${p.nom}`} onClick={() => confirm(t.confirmerSuppression) && agir(() => sb().delete().eq("id", p.id))}
                          className="flex size-9 items-center justify-center rounded-lg text-doux hover:text-rouge">×</button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-trait font-semibold">
                <td className="px-4 py-3">Total</td>
                <td className="px-2 py-3 text-right tabular-nums">{eur(totaux.estime)}</td>
                <td className="px-2 py-3 text-right tabular-nums">{eur(totaux.reajuste)}</td>
                <td className={`whitespace-nowrap px-4 py-3 text-right tabular-nums ${totaux.ecart > 0 ? "text-rouge" : totaux.ecart < 0 ? "text-vert" : ""}`}>{formatEcart(totaux.ecart, langue)}</td>
                {droits.editer && <td />}
              </tr>
            </tfoot>
          </table>
        </Carte>
      )}

      {droits.editer && (
        <Carte className="mt-4">
          <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={(e) => {
            e.preventDefault();
            if (!nom.trim()) return;
            const n = nom.trim();
            setNom("");
            agir(() => sb().insert({ couple_id: couple.id, nom: n, ordre: Math.max(0, ...donnees.map((x) => x.ordre)) + 1 }));
          }}>
            <Champ id="nouveau-poste" libelle={tb.nomPoste} value={nom} onChange={(e) => setNom(e.target.value)} maxLength={120} className="flex-1" />
            <Bouton type="submit">{tb.ajouterPoste}</Bouton>
          </form>
        </Carte>
      )}
    </>
  );
}

function CelluleMontant({ valeur, libelle, onValider }: { valeur: number | null; libelle: string; onValider: (v: string) => void }) {
  const [texte, setTexte] = useState(valeur === null ? "" : String(valeur).replace(".", ","));
  return (
    <input
      aria-label={libelle}
      inputMode="decimal"
      value={texte}
      placeholder="—"
      onChange={(e) => setTexte(e.target.value.replace(/[^\d,.\s]/g, ""))}
      onBlur={() => onValider(texte)}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      className="min-h-9 w-[4.5rem] rounded-lg sm:w-24 border border-transparent bg-transparent px-1.5 text-right tabular-nums hover:border-champ focus:border-bordeaux focus:bg-white focus:outline-none"
    />
  );
}

function CelluleTexte({ valeur, libelle, onValider }: { valeur: string; libelle: string; onValider: (v: string) => void }) {
  const [texte, setTexte] = useState(valeur);
  return (
    <input
      aria-label={libelle}
      value={texte}
      maxLength={120}
      onChange={(e) => setTexte(e.target.value)}
      onBlur={() => texte.trim() && texte !== valeur && onValider(texte.trim())}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      className="min-h-9 w-full min-w-24 rounded-lg border border-transparent bg-transparent px-1.5 hover:border-champ focus:border-bordeaux focus:bg-white focus:outline-none"
    />
  );
}
