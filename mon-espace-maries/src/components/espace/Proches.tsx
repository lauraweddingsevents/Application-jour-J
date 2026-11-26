"use client";
import { useState } from "react";
import { Bouton, Carte, Champ, Chargement, EnTetePage, MessageErreur, Vide } from "@/components/ui";
import { exiger, useAgir, useDonnees, useEspace } from "@/lib/espace";
import { supabaseNavigateur } from "@/lib/supabase/navigateur";
import type { Proche } from "@/lib/types";

type Valeurs = { nom: string; role: string; telephone: string };

export function Proches() {
  const { couple, t, langue } = useEspace();
  const { donnees, erreur, recharger } = useDonnees(
    () => exiger(supabaseNavigateur().from("proches").select("*").eq("couple_id", couple.id).order("cree_le")) as Promise<Proche[]>,
    [couple.id],
  );
  const { agir, erreurAction } = useAgir(recharger, langue);
  const [edite, setEdite] = useState<Proche | "nouveau" | null>(null);
  const tp = t.proches;
  const sb = () => supabaseNavigateur().from("proches");

  return (
    <>
      <EnTetePage titre={tp.titre} intro={tp.intro} action={!edite && <Bouton onClick={() => setEdite("nouveau")}>+ {tp.ajouter}</Bouton>} />
      <MessageErreur>{erreur || erreurAction}</MessageErreur>
      {edite && (
        <FormulaireProche
          valeur={edite === "nouveau" ? null : edite}
          onFermer={() => setEdite(null)}
          onEnregistrer={async (v) => {
            if (await agir(() => (edite === "nouveau" ? sb().insert({ couple_id: couple.id, ...v }) : sb().update(v).eq("id", edite.id)))) setEdite(null);
          }}
          onSupprimer={edite !== "nouveau" ? async () => { if (confirm(t.confirmerSuppression) && (await agir(() => sb().delete().eq("id", edite.id)))) setEdite(null); } : undefined}
        />
      )}
      {!donnees ? (!erreur && <Chargement texte={t.chargement} />) : donnees.length === 0 ? <Vide>{tp.vide}</Vide> : (
        <Carte className="px-4 py-1 sm:px-5">
          <ul>
            {donnees.map((p) => (
              <li key={p.id} className="flex min-h-16 items-center gap-3 border-b border-trait-fin py-3 last:border-none">
                <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full bg-bordeaux-pale font-titre text-lg font-semibold text-bordeaux">
                  {p.nom.charAt(0).toUpperCase()}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-[15px] font-semibold">{p.nom}</span>
                  {p.role && <span className="text-[13px] text-doux">{p.role}</span>}
                </div>
                {p.telephone && <a href={`tel:${p.telephone.replace(/\s/g, "")}`} className="whitespace-nowrap text-sm font-medium text-bordeaux">{p.telephone}</a>}
                <button type="button" onClick={() => setEdite(p)} className="min-h-9 text-sm font-semibold text-bordeaux">{t.modifier}</button>
              </li>
            ))}
          </ul>
        </Carte>
      )}
    </>
  );
}

function FormulaireProche({ valeur, onFermer, onEnregistrer, onSupprimer }: {
  valeur: Proche | null; onFermer: () => void; onEnregistrer: (v: Valeurs) => void; onSupprimer?: () => void;
}) {
  const { t } = useEspace();
  const tp = t.proches;
  const [v, setV] = useState<Valeurs>({ nom: valeur?.nom ?? "", role: valeur?.role ?? "", telephone: valeur?.telephone ?? "" });
  return (
    <Carte className="mb-4">
      <form className="grid gap-3 sm:grid-cols-3" onSubmit={(e) => { e.preventDefault(); if (v.nom.trim()) onEnregistrer({ ...v, nom: v.nom.trim() }); }}>
        <Champ id="pc-nom" libelle={tp.nom} value={v.nom} onChange={(e) => setV({ ...v, nom: e.target.value })} maxLength={120} required />
        <Champ id="pc-role" libelle={tp.role} value={v.role} onChange={(e) => setV({ ...v, role: e.target.value })} maxLength={160} />
        <Champ id="pc-tel" libelle={tp.telephone} type="tel" value={v.telephone} onChange={(e) => setV({ ...v, telephone: e.target.value })} maxLength={40} />
        <div className="flex flex-wrap gap-2 sm:col-span-3">
          <Bouton type="submit">{t.enregistrer}</Bouton>
          <Bouton variante="secondaire" onClick={onFermer}>{t.annuler}</Bouton>
          {onSupprimer && <Bouton variante="danger" className="ml-auto" onClick={onSupprimer}>{t.supprimer}</Bouton>}
        </div>
      </form>
    </Carte>
  );
}
