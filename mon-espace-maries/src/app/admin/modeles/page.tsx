"use client";
import { useState } from "react";
import { Bouton, Carte, Chargement, EnTetePage, MessageErreur, Selecteur, TitreCarte } from "@/components/ui";
import { exiger, useAgir, useDonnees } from "@/lib/espace";
import { supabaseNavigateur } from "@/lib/supabase/navigateur";

type Ligne = { id: string; nom: string; ordre: number; estime?: number | null };
type QuestionModele = { id: string; theme: string; texte: string; type: "libre" | "choix"; choix: string[]; sous_question: string; sous_question_si: string; ordre: number };
type Table = "modele_etapes" | "modele_sous_etapes" | "modele_budget";

// Modèles copiés dans chaque nouvel espace, puis ajustables couple par couple sans toucher au modèle
export default function Modeles() {
  return (
    <>
      <EnTetePage titre="Modèles types" intro="Copiés dans chaque nouvel espace à sa création. Les modifier ne change pas les espaces déjà créés." />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 xl:items-start">
        <ListeModele table="modele_etapes" titre="Rétroplanning type" aide="Les étapes qui commencent par « Recherche » reçoivent automatiquement les sous-étapes types." />
        <ListeModele table="modele_sous_etapes" titre="Sous-étapes d'une recherche de prestataire" aide="Ajoutées à chaque nouvelle « Recherche … », y compris en cours d'organisation." />
        <ListeModele table="modele_budget" titre="Budget type" aide="Montant estimé facultatif." avecMontant />
        <QuestionsModele />
      </div>
    </>
  );
}

function ListeModele({ table, titre, aide, avecMontant = false }: { table: Table; titre: string; aide: string; avecMontant?: boolean }) {
  const { donnees, erreur, recharger } = useDonnees(() => exiger(supabaseNavigateur().from(table).select("*").order("ordre")) as Promise<Ligne[]>, [table]);
  const { agir, erreurAction } = useAgir(recharger, "fr");
  const [nouveau, setNouveau] = useState("");
  const sb = () => supabaseNavigateur().from(table);

  async function deplacer(i: number, sens: -1 | 1) {
    if (!donnees) return;
    const a = donnees[i];
    const b = donnees[i + sens];
    if (!b) return;
    await agir(() => sb().update({ ordre: b.ordre }).eq("id", a.id));
    await agir(() => sb().update({ ordre: a.ordre === b.ordre ? a.ordre + sens * -1 : a.ordre }).eq("id", b.id));
  }

  return (
    <Carte className="flex flex-col gap-3">
      <div>
        <TitreCarte>{titre}</TitreCarte>
        <p className="text-xs text-doux">{aide}</p>
      </div>
      <MessageErreur>{erreur || erreurAction}</MessageErreur>
      {!donnees ? <Chargement /> : (
        <ol className="flex flex-col gap-1.5">
          {donnees.map((l, i) => (
            <li key={l.id} className="flex items-center gap-1.5">
              <span className="w-5 text-right text-xs text-doux">{i + 1}.</span>
              <input aria-label={`Nom ${i + 1}`} defaultValue={l.nom} maxLength={120}
                onBlur={(e) => e.target.value.trim() && e.target.value !== l.nom && agir(() => sb().update({ nom: e.target.value.trim() }).eq("id", l.id))}
                className="min-h-10 min-w-0 flex-1 rounded-[10px] border border-champ bg-white px-2.5 text-sm" />
              {avecMontant && (
                <input aria-label={`Estimé ${l.nom}`} inputMode="decimal" defaultValue={l.estime ?? ""} placeholder="€"
                  onBlur={(e) => {
                    const n = e.target.value.trim() === "" ? null : Number(e.target.value.replace(",", "."));
                    if (n === null || Number.isFinite(n)) agir(() => sb().update({ estime: n }).eq("id", l.id));
                  }}
                  className="min-h-10 w-20 rounded-[10px] border border-champ bg-white px-2 text-right text-sm" />
              )}
              <button type="button" aria-label="Monter" disabled={i === 0} onClick={() => deplacer(i, -1)} className="flex size-10 items-center justify-center rounded-[10px] border border-champ bg-white text-bordeaux disabled:opacity-30">↑</button>
              <button type="button" aria-label="Descendre" disabled={i === donnees.length - 1} onClick={() => deplacer(i, 1)} className="flex size-10 items-center justify-center rounded-[10px] border border-champ bg-white text-bordeaux disabled:opacity-30">↓</button>
              <button type="button" aria-label={`Supprimer ${l.nom}`} onClick={() => confirm(`Supprimer « ${l.nom} » du modèle ?`) && agir(() => sb().delete().eq("id", l.id))}
                className="flex size-10 items-center justify-center rounded-[10px] text-doux hover:text-rouge">×</button>
            </li>
          ))}
        </ol>
      )}
      <form className="flex gap-2" onSubmit={(e) => {
        e.preventDefault();
        if (!nouveau.trim()) return;
        const nom = nouveau.trim();
        setNouveau("");
        agir(() => sb().insert({ nom, ordre: Math.max(0, ...(donnees ?? []).map((x) => x.ordre)) + 1 }));
      }}>
        <input aria-label={`Ajouter à ${titre}`} placeholder="Ajouter…" value={nouveau} onChange={(e) => setNouveau(e.target.value)} maxLength={120}
          className="min-h-11 min-w-0 flex-1 rounded-[10px] border border-champ bg-white px-3 text-sm" />
        <Bouton type="submit">Ajouter</Bouton>
      </form>
    </Carte>
  );
}

function QuestionsModele() {
  const { donnees, erreur, recharger } = useDonnees(() => exiger(supabaseNavigateur().from("modele_questions").select("*").order("ordre")) as Promise<QuestionModele[]>, []);
  const { agir, erreurAction } = useAgir(recharger, "fr");
  const [edite, setEdite] = useState<QuestionModele | "nouvelle" | null>(null);
  const sb = () => supabaseNavigateur().from("modele_questions");

  return (
    <Carte className="flex flex-col gap-3 xl:col-span-2">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <TitreCarte>Questions du questionnaire à deux</TitreCarte>
          <p className="text-xs text-doux">Rangées par thème, dans l&apos;ordre affiché.</p>
        </div>
        {!edite && <Bouton onClick={() => setEdite("nouvelle")}>+ Question</Bouton>}
      </div>
      <MessageErreur>{erreur || erreurAction}</MessageErreur>
      {edite && (
        <FormQuestion q={edite === "nouvelle" ? null : edite} onFermer={() => setEdite(null)}
          onEnregistrer={async (v) => {
            const ok = await agir(() => (edite === "nouvelle" ? sb().insert({ ...v, ordre: Math.max(0, ...(donnees ?? []).map((x) => x.ordre)) + 1 }) : sb().update(v).eq("id", edite.id)));
            if (ok) setEdite(null);
          }} />
      )}
      {!donnees ? <Chargement /> : (
        <ol className="flex flex-col divide-y divide-trait-fin">
          {donnees.map((q, i) => (
            <li key={q.id} className="flex items-start gap-3 py-2.5">
              <span className="w-6 text-right text-sm font-semibold text-bordeaux">{i + 1}.</span>
              <div className="flex flex-1 flex-col gap-0.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-doux">{q.theme}</span>
                <span className="text-sm">{q.texte}</span>
                {q.type === "choix" && <span className="text-xs text-doux">Choix multiple : {q.choix.join(" · ")}{q.sous_question && ` — si « ${q.sous_question_si} » : ${q.sous_question}`}</span>}
              </div>
              <button type="button" onClick={() => setEdite(q)} className="min-h-9 text-sm font-semibold text-bordeaux">Modifier</button>
              <button type="button" aria-label="Supprimer la question" onClick={() => confirm("Supprimer cette question du modèle ?") && agir(() => sb().delete().eq("id", q.id))} className="min-h-9 px-2 text-doux hover:text-rouge">×</button>
            </li>
          ))}
        </ol>
      )}
    </Carte>
  );
}

function FormQuestion({ q, onFermer, onEnregistrer }: { q: QuestionModele | null; onFermer: () => void; onEnregistrer: (v: Omit<QuestionModele, "id" | "ordre">) => void }) {
  const [v, setV] = useState({
    theme: q?.theme ?? "", texte: q?.texte ?? "", type: q?.type ?? ("libre" as "libre" | "choix"),
    choix: (q?.choix ?? []).join(", "), sous_question: q?.sous_question ?? "", sous_question_si: q?.sous_question_si ?? "",
  });
  const classe = "min-h-11 rounded-[10px] border border-champ bg-white px-3 text-sm";
  return (
    <form className="grid gap-3 rounded-xl bg-fond p-3 sm:grid-cols-2" onSubmit={(e) => {
      e.preventDefault();
      if (!v.theme.trim() || !v.texte.trim()) return;
      onEnregistrer({
        theme: v.theme.trim(), texte: v.texte.trim(), type: v.type,
        choix: v.type === "choix" ? v.choix.split(",").map((c) => c.trim()).filter(Boolean) : [],
        sous_question: v.type === "choix" ? v.sous_question.trim() : "", sous_question_si: v.type === "choix" ? v.sous_question_si.trim() : "",
      });
    }}>
      <label className="flex flex-col gap-1 text-xs text-doux">Thème<input className={classe} value={v.theme} onChange={(e) => setV({ ...v, theme: e.target.value })} maxLength={120} required /></label>
      <Selecteur id="fq-type" libelle="Type de réponse" value={v.type} onChange={(e) => setV({ ...v, type: e.target.value as "libre" | "choix" })}
        options={[{ valeur: "libre", texte: "Réponse libre" }, { valeur: "choix", texte: "Choix multiple" }]} />
      <label className="flex flex-col gap-1 text-xs text-doux sm:col-span-2">Question<input className={classe} value={v.texte} onChange={(e) => setV({ ...v, texte: e.target.value })} maxLength={500} required /></label>
      {v.type === "choix" && (
        <>
          <label className="flex flex-col gap-1 text-xs text-doux sm:col-span-2">Choix (séparés par des virgules)<input className={classe} value={v.choix} onChange={(e) => setV({ ...v, choix: e.target.value })} placeholder="civile, religieuse, laïque" /></label>
          <label className="flex flex-col gap-1 text-xs text-doux">Question complémentaire (facultatif)<input className={classe} value={v.sous_question} onChange={(e) => setV({ ...v, sous_question: e.target.value })} maxLength={500} placeholder="Qui aimeriez-vous y faire parler ?" /></label>
          <label className="flex flex-col gap-1 text-xs text-doux">…affichée si ce choix est coché<input className={classe} value={v.sous_question_si} onChange={(e) => setV({ ...v, sous_question_si: e.target.value })} maxLength={120} placeholder="laïque" /></label>
        </>
      )}
      <div className="flex gap-2 sm:col-span-2">
        <Bouton type="submit">Enregistrer</Bouton>
        <Bouton variante="secondaire" onClick={onFermer}>Annuler</Bouton>
      </div>
    </form>
  );
}
