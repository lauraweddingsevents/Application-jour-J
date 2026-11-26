"use client";
import { useState } from "react";
import { Bouton, Carte, Champ, Chargement, EnTetePage, MessageErreur, Pastille, Selecteur, Vide, type Ton } from "@/components/ui";
import { exiger, useAgir, useDonnees, useEspace } from "@/lib/espace";
import { supabaseNavigateur } from "@/lib/supabase/navigateur";
import type { Prestataire, StatutPrestataire } from "@/lib/types";

const TON: Record<StatutPrestataire, Ton> = { a_signer: "orange", signe: "vert", acompte: "vert" };
type Valeurs = Omit<Prestataire, "id" | "couple_id">;

export function chargerPrestataires(coupleId: string) {
  return exiger(supabaseNavigateur().from("prestataires").select("*").eq("couple_id", coupleId).order("categorie").order("nom")) as Promise<Prestataire[]>;
}

export function Prestataires() {
  const { couple, droits, t, langue } = useEspace();
  const { donnees, erreur, recharger } = useDonnees(() => chargerPrestataires(couple.id), [couple.id]);
  const { agir, erreurAction } = useAgir(recharger, langue);
  const [edite, setEdite] = useState<Prestataire | "nouveau" | null>(null);
  const tp = t.prestataires;
  const sb = () => supabaseNavigateur().from("prestataires");

  return (
    <>
      <EnTetePage titre={tp.titre} intro={droits.editer ? undefined : t.lectureSeule}
        action={droits.editer && !edite && <Bouton onClick={() => setEdite("nouveau")}>+ {tp.ajouter}</Bouton>} />
      <MessageErreur>{erreur || erreurAction}</MessageErreur>
      {edite && (
        <FormulairePrestataire
          valeur={edite === "nouveau" ? null : edite}
          onFermer={() => setEdite(null)}
          onEnregistrer={async (v) => {
            if (await agir(() => (edite === "nouveau" ? sb().insert({ couple_id: couple.id, ...v }) : sb().update(v).eq("id", edite.id)))) setEdite(null);
          }}
          onSupprimer={edite !== "nouveau" ? async () => { if (confirm(t.confirmerSuppression) && (await agir(() => sb().delete().eq("id", edite.id)))) setEdite(null); } : undefined}
        />
      )}
      {!donnees ? (!erreur && <Chargement texte={t.chargement} />) : donnees.length === 0 ? <Vide>{tp.vide}</Vide> : (
        <div className="grid gap-3 lg:grid-cols-2">
          {donnees.map((p) => (
            <Carte key={p.id} className="flex flex-col gap-1.5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-0.5">
                  {p.categorie && <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-bordeaux">{p.categorie}</span>}
                  <span className="text-[15px] font-semibold">{p.nom}</span>
                  {p.contact && <span className="text-[13px] text-doux">{tp.contact} : {p.contact}</span>}
                </div>
                <Pastille ton={TON[p.statut]}>{tp.statuts[p.statut]}</Pastille>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                {p.telephone && <a href={`tel:${p.telephone.replace(/\s/g, "")}`} className="min-h-8 font-medium text-bordeaux underline-offset-4 hover:underline">{p.telephone}</a>}
                {p.email && <a href={`mailto:${p.email}`} className="min-h-8 break-all font-medium text-bordeaux underline-offset-4 hover:underline">{p.email}</a>}
              </div>
              {droits.editer && <button type="button" onClick={() => setEdite(p)} className="self-start text-sm font-semibold text-bordeaux">{t.modifier}</button>}
            </Carte>
          ))}
        </div>
      )}
    </>
  );
}

function FormulairePrestataire({ valeur, onFermer, onEnregistrer, onSupprimer }: {
  valeur: Prestataire | null; onFermer: () => void; onEnregistrer: (v: Valeurs) => void; onSupprimer?: () => void;
}) {
  const { t } = useEspace();
  const tp = t.prestataires;
  const [v, setV] = useState<Valeurs>({
    categorie: valeur?.categorie ?? "", nom: valeur?.nom ?? "", contact: valeur?.contact ?? "",
    telephone: valeur?.telephone ?? "", email: valeur?.email ?? "", statut: valeur?.statut ?? "a_signer",
  });
  const champ = (cle: keyof Valeurs) => ({ value: v[cle], onChange: (e: { target: { value: string } }) => setV({ ...v, [cle]: e.target.value }) });
  return (
    <Carte className="mb-4">
      <form className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); if (v.nom.trim()) onEnregistrer({ ...v, nom: v.nom.trim() }); }}>
        <Champ id="pr-cat" libelle={tp.categorie} maxLength={80} {...champ("categorie")} />
        <Champ id="pr-nom" libelle={tp.nom} maxLength={160} required {...champ("nom")} />
        <Champ id="pr-contact" libelle={tp.contact} maxLength={120} {...champ("contact")} />
        <Champ id="pr-tel" libelle={tp.telephone} type="tel" maxLength={40} {...champ("telephone")} />
        <Champ id="pr-email" libelle={tp.email} type="email" maxLength={200} {...champ("email")} />
        <Selecteur id="pr-statut" libelle={tp.statut} {...champ("statut")}
          options={(["a_signer", "signe", "acompte"] as const).map((s) => ({ valeur: s, texte: tp.statuts[s] }))} />
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <Bouton type="submit">{t.enregistrer}</Bouton>
          <Bouton variante="secondaire" onClick={onFermer}>{t.annuler}</Bouton>
          {onSupprimer && <Bouton variante="danger" className="ml-auto" onClick={onSupprimer}>{t.supprimer}</Bouton>}
        </div>
      </form>
    </Carte>
  );
}
