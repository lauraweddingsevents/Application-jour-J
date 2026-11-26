"use client";
import { useState } from "react";
import { Bouton, Carte, Champ, Chargement, EnTetePage, MessageErreur, Vide } from "@/components/ui";
import { exiger, useAgir, useDonnees, useEspace } from "@/lib/espace";
import { supabaseNavigateur } from "@/lib/supabase/navigateur";
import { depuisInstant, formatDate, formatDateHeure, versInstant } from "@/lib/calculs";
import { notifierServeur } from "@/lib/notifier";
import type { RendezVous as Rdv } from "@/lib/types";

export function chargerRendezVous(coupleId: string) {
  return exiger(supabaseNavigateur().from("rendez_vous").select("*").eq("couple_id", coupleId).order("debut", { nullsFirst: false })) as Promise<Rdv[]>;
}

// À venir (ou date à fixer) / passés
export function trierRendezVous(liste: Rdv[], maintenant = new Date()) {
  const limite = maintenant.getTime() - 3 * 3600000;
  const aVenir = liste.filter((r) => !r.debut || new Date(r.debut).getTime() >= limite);
  const passes = liste.filter((r) => r.debut && new Date(r.debut).getTime() < limite).reverse();
  return { aVenir, passes };
}

export function RendezVous() {
  const { couple, droits, t, langue } = useEspace();
  const { donnees, erreur, recharger } = useDonnees(() => chargerRendezVous(couple.id), [couple.id]);
  const { agir, erreurAction } = useAgir(recharger, langue, notifierServeur);
  const [edite, setEdite] = useState<Rdv | "nouveau" | null>(null);
  const tr = t.rdv;

  if (!donnees) return <><EnTetePage titre={tr.titre} /><MessageErreur>{erreur}</MessageErreur>{!erreur && <Chargement texte={t.chargement} />}</>;
  const { aVenir, passes } = trierRendezVous(donnees);
  const auteur = (r: Rdv) => (r.ajoute_par === "laura" ? tr.parLaura : droits.admin ? tr.parCouple : tr.parVous);

  const carte = (r: Rdv, passe = false) => {
    const jour = r.debut ? formatDate(r.debut, langue, { day: "2-digit" }) : "—";
    const mois = r.debut ? formatDate(r.debut, langue, { month: "short" }) : r.date_a_fixer.split(" ")[0] || "";
    return (
      <Carte key={r.id} className={`flex items-start gap-3.5 ${passe ? "opacity-70" : ""}`}>
        <div className="flex w-14 shrink-0 flex-col items-center rounded-xl bg-bordeaux-pale py-2 text-bordeaux">
          <span className="font-titre text-2xl font-semibold leading-none">{jour}</span>
          <span className="text-[11px] font-semibold uppercase">{mois}</span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[15px] font-semibold">{r.titre}</span>
          <span className="text-[13px]">{r.debut ? formatDateHeure(r.debut, langue) : r.date_a_fixer || tr.dateAFixer}</span>
          <span className="text-[13px] text-doux">{[r.visio ? tr.visio : "", r.lieu].filter(Boolean).join(" · ")}</span>
          <span className="mt-1 text-[11px] font-semibold text-bordeaux">{auteur(r)}</span>
        </div>
        <button type="button" onClick={() => setEdite(r)} className="min-h-9 text-sm font-semibold text-bordeaux">{t.modifier}</button>
      </Carte>
    );
  };

  return (
    <>
      <EnTetePage titre={tr.titre} action={!edite && <Bouton onClick={() => setEdite("nouveau")}>+ {tr.ajouter}</Bouton>} />
      <MessageErreur>{erreurAction}</MessageErreur>
      {edite && (
        <FormulaireRdv
          rdv={edite === "nouveau" ? null : edite}
          onFermer={() => setEdite(null)}
          onEnregistrer={async (v) => {
            const ok = await agir(() =>
              edite === "nouveau"
                ? supabaseNavigateur().from("rendez_vous").insert({ couple_id: couple.id, ...v })
                : supabaseNavigateur().from("rendez_vous").update(v).eq("id", edite.id),
            );
            if (ok) setEdite(null);
          }}
          onSupprimer={edite !== "nouveau" ? async () => { if (confirm(t.confirmerSuppression) && (await agir(() => supabaseNavigateur().from("rendez_vous").delete().eq("id", edite.id)))) setEdite(null); } : undefined}
        />
      )}
      {aVenir.length === 0 && !edite && <Vide>{tr.vide}</Vide>}
      <div className="grid gap-3 lg:grid-cols-2">{aVenir.map((r) => carte(r))}</div>
      {passes.length > 0 && (
        <>
          <h2 className="mb-2 mt-6 font-titre text-xl font-semibold">{tr.passes}</h2>
          <div className="grid gap-3 lg:grid-cols-2">{passes.map((r) => carte(r, true))}</div>
        </>
      )}
    </>
  );
}

function FormulaireRdv({ rdv, onFermer, onEnregistrer, onSupprimer }: {
  rdv: Rdv | null;
  onFermer: () => void;
  onEnregistrer: (v: { titre: string; debut: string | null; date_a_fixer: string; lieu: string; visio: boolean }) => void;
  onSupprimer?: () => void;
}) {
  const { t } = useEspace();
  const tr = t.rdv;
  const depart = depuisInstant(rdv?.debut ?? null);
  const [titre, setTitre] = useState(rdv?.titre ?? "");
  const [date, setDate] = useState(depart.date);
  const [heure, setHeure] = useState(depart.heure);
  const [aFixer, setAFixer] = useState(rdv?.date_a_fixer ?? "");
  const [lieu, setLieu] = useState(rdv?.lieu ?? "");
  const [visio, setVisio] = useState(rdv?.visio ?? false);
  return (
    <Carte className="mb-4">
      <form className="flex flex-col gap-3" onSubmit={(e) => {
        e.preventDefault();
        if (!titre.trim()) return;
        onEnregistrer({ titre: titre.trim(), debut: versInstant(date, heure), date_a_fixer: date ? "" : aFixer.trim(), lieu: lieu.trim(), visio });
      }}>
        <Champ id="rdv-titre" libelle={tr.objet} value={titre} onChange={(e) => setTitre(e.target.value)} maxLength={160} required />
        <div className="grid grid-cols-2 gap-3">
          <Champ id="rdv-date" libelle={tr.date} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <Champ id="rdv-heure" libelle={tr.heure} type="time" value={heure} onChange={(e) => setHeure(e.target.value)} disabled={!date} />
        </div>
        {!date && <Champ id="rdv-fixer" libelle={tr.dateAFixer} aide={tr.dateAFixerAide} value={aFixer} onChange={(e) => setAFixer(e.target.value)} maxLength={80} />}
        <Champ id="rdv-lieu" libelle={tr.lieu} value={lieu} onChange={(e) => setLieu(e.target.value)} maxLength={200} />
        <label className="flex min-h-11 items-center gap-2.5 text-sm">
          <input type="checkbox" checked={visio} onChange={(e) => setVisio(e.target.checked)} className="size-5 accent-bordeaux" />
          {tr.visio}
        </label>
        <div className="flex flex-wrap gap-2">
          <Bouton type="submit">{t.enregistrer}</Bouton>
          <Bouton variante="secondaire" onClick={onFermer}>{t.annuler}</Bouton>
          {onSupprimer && <Bouton variante="danger" className="ml-auto" onClick={onSupprimer}>{t.supprimer}</Bouton>}
        </div>
      </form>
    </Carte>
  );
}
