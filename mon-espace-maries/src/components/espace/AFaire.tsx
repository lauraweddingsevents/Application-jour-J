"use client";
import { useState } from "react";
import { Bouton, Carte, CaseRonde, Champ, Chargement, EnTetePage, MessageErreur, Vide } from "@/components/ui";
import { exiger, useAgir, useDonnees, useEspace } from "@/lib/espace";
import { supabaseNavigateur } from "@/lib/supabase/navigateur";
import { aujourdhuiParis, formatDate } from "@/lib/calculs";
import { notifierServeur } from "@/lib/notifier";
import type { Tache } from "@/lib/types";

export function chargerTaches(coupleId: string) {
  return exiger(supabaseNavigateur().from("taches").select("*").eq("couple_id", coupleId).order("date_butoir", { nullsFirst: false }).order("cree_le")) as Promise<Tache[]>;
}

export function AFaire() {
  const { couple, droits, t, langue } = useEspace();
  const { donnees, erreur, recharger, setDonnees } = useDonnees(() => chargerTaches(couple.id), [couple.id]);
  const { agir, erreurAction } = useAgir(recharger, langue, notifierServeur);
  const ta = t.aFaire;
  const aujourdhui = aujourdhuiParis();

  if (!donnees) return <><EnTetePage titre={ta.titre} /><MessageErreur>{erreur}</MessageErreur>{!erreur && <Chargement texte={t.chargement} />}</>;
  const triees = [...donnees.filter((x) => !x.fait_le), ...donnees.filter((x) => x.fait_le)];

  function cocher(x: Tache) {
    const fait = !x.fait_le;
    setDonnees(donnees!.map((y) => (y.id === x.id ? { ...y, fait_le: fait ? new Date().toISOString() : null } : y)));
    agir(() => supabaseNavigateur().rpc("cocher_tache", { p_tache: x.id, p_fait: fait }));
  }

  return (
    <>
      <EnTetePage titre={ta.titre} intro={droits.admin ? "Les tâches confiées aux mariés. Ils reçoivent une notification, puis un rappel 3 jours avant la date butoir." : ta.intro} />
      <MessageErreur>{erreurAction}</MessageErreur>
      {droits.admin && <NouvelleTache onAjouter={(v) => agir(() => supabaseNavigateur().from("taches").insert({ couple_id: couple.id, ...v }))} />}
      {triees.length === 0 ? <Vide>{ta.vide}</Vide> : (
        <Carte className="px-4 py-1 sm:px-5">
          <ul>
            {triees.map((x) => {
              const retard = !x.fait_le && x.date_butoir && x.date_butoir < aujourdhui;
              return (
                <li key={x.id} className="flex min-h-16 items-center gap-3 border-b border-trait-fin py-3 last:border-none">
                  <CaseRonde coche={!!x.fait_le} onClick={() => cocher(x)} libelle={x.intitule} disabled={droits.admin} />
                  <div className="flex flex-1 flex-col gap-0.5">
                    <span className={`text-[15px] ${x.fait_le ? "text-doux line-through" : "font-medium"}`}>{x.intitule}</span>
                    <span className={`text-xs ${x.fait_le ? "text-vert" : retard ? "font-semibold text-rouge" : "text-orange"}`}>
                      {x.fait_le ? ta.fait : x.date_butoir ? `${retard ? `${ta.enRetard} · ` : ""}${ta.avant(formatDate(x.date_butoir, langue))}` : ""}
                    </span>
                  </div>
                  {droits.admin && (
                    <button type="button" aria-label={`${t.supprimer} ${x.intitule}`} onClick={() => confirm(t.confirmerSuppression) && agir(() => supabaseNavigateur().from("taches").delete().eq("id", x.id))}
                      className="flex size-9 items-center justify-center rounded-lg text-doux hover:text-rouge">×</button>
                  )}
                </li>
              );
            })}
          </ul>
        </Carte>
      )}
    </>
  );
}

// « Donner une tâche aux mariés » (Laura)
export function NouvelleTache({ onAjouter }: { onAjouter: (v: { intitule: string; date_butoir: string | null }) => Promise<boolean> }) {
  const [intitule, setIntitule] = useState("");
  const [date, setDate] = useState("");
  const [envoye, setEnvoye] = useState(false);
  return (
    <Carte className="mb-4">
      <form className="flex flex-col gap-3" onSubmit={async (e) => {
        e.preventDefault();
        if (!intitule.trim()) return;
        if (await onAjouter({ intitule: intitule.trim(), date_butoir: date || null })) {
          setIntitule("");
          setDate("");
          setEnvoye(true);
        }
      }}>
        <p className="font-titre text-[22px] font-semibold">Donner une tâche aux mariés</p>
        <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
          <Champ id="tache-intitule" libelle="Tâche" placeholder="Ex. : envoyer la liste de vos invités" value={intitule} onChange={(e) => { setIntitule(e.target.value); setEnvoye(false); }} maxLength={200} required />
          <Champ id="tache-date" libelle="Date butoir" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <Bouton type="submit" className="sm:self-start">Envoyer aux mariés</Bouton>
        {envoye && <p className="rounded-[10px] bg-vert-pale px-3 py-2 text-xs text-vert">Tâche ajoutée dans « À faire de votre côté ». Les mariés reçoivent une notification, puis un rappel 3 jours avant la date butoir.</p>}
      </form>
    </Carte>
  );
}
