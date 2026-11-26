"use client";
import { useState } from "react";
import { Bouton, Carte, Chargement, EnTetePage, MessageErreur, Pastille, Vide, type Ton } from "@/components/ui";
import { exiger, useAgir, useDonnees, useEspace } from "@/lib/espace";
import { supabaseNavigateur } from "@/lib/supabase/navigateur";
import type { Personne, Question, Reponse } from "@/lib/types";

export const VERDICTS = {
  fr: ["Vous êtes d'accord", "Des envies proches", "Deux idées qui se complètent", "Un équilibre à trouver"],
  en: ["You agree", "Similar wishes", "Two ideas that complement each other", "A balance to find"],
};

export function tonVerdict(v: string): Ton {
  if ([0, 1].some((i) => VERDICTS.fr[i] === v || VERDICTS.en[i] === v)) return "vert";
  if (VERDICTS.fr[3] === v || VERDICTS.en[3] === v) return "orange";
  return "bordeaux";
}

type Donnees = { questions: Question[]; reponses: Reponse[]; repondu: { question_id: string; personne_id: string }[] };

export function chargerQuestionnaire(coupleId: string): Promise<Donnees> {
  const sb = supabaseNavigateur();
  return Promise.all([
    exiger(sb.from("questions").select("*").eq("couple_id", coupleId).order("ordre")),
    exiger(sb.from("reponses").select("*").eq("couple_id", coupleId)),
    exiger(sb.rpc("qui_a_repondu", { p_couple: coupleId })),
  ]).then(([questions, reponses, repondu]) => ({
    questions: questions as Question[],
    reponses: reponses as Reponse[],
    repondu: (repondu ?? []) as Donnees["repondu"],
  }));
}

const aRepondu = (r?: Reponse) => !!r && (r.texte.trim() !== "" || r.choix.length > 0);

export function Questionnaire() {
  const { couple, maries, moi, droits, t, langue } = useEspace();
  const { donnees, erreur, recharger } = useDonnees(() => chargerQuestionnaire(couple.id), [couple.id]);
  const { agir, erreurAction } = useAgir(recharger, langue);
  const tq = t.questionnaire;

  if (!donnees) return <><EnTetePage titre={tq.titre} /><MessageErreur>{erreur}</MessageErreur>{!erreur && <Chargement texte={t.chargement} />}</>;
  if (donnees.questions.length === 0) return <><EnTetePage titre={tq.titre} /><Vide>{tq.vide}</Vide></>;

  const autre: Personne | undefined = maries.find((p) => p.id !== moi?.id);
  const themes = [...new Set(donnees.questions.map((q) => q.theme))];
  const mesReponses = moi ? donnees.repondu.filter((r) => r.personne_id === moi.id).length : 0;
  let numero = 0;

  return (
    <>
      <EnTetePage titre={tq.titre} intro={droits.admin ? "Les réponses de chacun des mariés. Posez votre verdict sur chaque question répondue par les deux." : tq.intro} />
      {moi && <p className="mb-3 text-sm font-medium text-bordeaux">{tq.progression(mesReponses, donnees.questions.length)}</p>}
      <MessageErreur>{erreurAction}</MessageErreur>
      <div className="flex flex-col gap-6">
        {themes.map((theme) => (
          <section key={theme} className="flex flex-col gap-3">
            <h2 className="font-titre text-2xl font-semibold">{theme}</h2>
            {donnees.questions.filter((q) => q.theme === theme).map((q) => {
              numero++;
              const rep = (pid?: string) => donnees.reponses.find((r) => r.question_id === q.id && r.personne_id === pid);
              const aFait = (pid?: string) => donnees.repondu.some((r) => r.question_id === q.id && r.personne_id === pid);
              return droits.admin ? (
                <QuestionAdmin key={q.id} q={q} n={numero} maries={maries} rep={rep} langue={couple.langue}
                  onVerdict={(verdict) => agir(() => supabaseNavigateur().from("questions").update({ verdict }).eq("id", q.id))} />
              ) : (
                <QuestionMarie key={q.id} q={q} n={numero} moi={moi!} autre={autre} maReponse={rep(moi?.id)} saReponse={rep(autre?.id)}
                  autreARepondu={aFait(autre?.id)}
                  onEnregistrer={(v) => agir(() => supabaseNavigateur().rpc("repondre", { p_question: q.id, p_texte: v.texte, p_choix: v.choix, p_sous_reponse: v.sous_reponse }))} />
              );
            })}
          </section>
        ))}
      </div>
    </>
  );
}

function QuestionMarie({ q, n, moi, autre, maReponse, saReponse, autreARepondu, onEnregistrer }: {
  q: Question; n: number; moi: Personne; autre?: Personne; maReponse?: Reponse; saReponse?: Reponse; autreARepondu: boolean;
  onEnregistrer: (v: { texte: string; choix: string[]; sous_reponse: string }) => Promise<boolean>;
}) {
  const { t } = useEspace();
  const tq = t.questionnaire;
  const [edition, setEdition] = useState(!aRepondu(maReponse));
  const [texte, setTexte] = useState(maReponse?.texte ?? "");
  const [choix, setChoix] = useState<string[]>(maReponse?.choix ?? []);
  const [sous, setSous] = useState(maReponse?.sous_reponse ?? "");
  const jAiRepondu = aRepondu(maReponse);
  const lesDeux = jAiRepondu && aRepondu(saReponse);
  const montrerSous = q.type === "choix" && q.sous_question && choix.includes(q.sous_question_si);
  const prenomAutre = autre?.prenom || "?";

  return (
    <Carte className="flex flex-col gap-3">
      <p className="text-[15px] font-semibold leading-snug"><span className="text-bordeaux">{n}.</span> {q.texte}</p>
      {q.type === "choix" && <p className="-mt-2 text-xs text-doux">{tq.choixMultiple} : {q.choix.join(" · ")}</p>}

      {edition ? (
        <form className="flex flex-col gap-3" onSubmit={async (e) => {
          e.preventDefault();
          const ok = await onEnregistrer({ texte: texte.trim(), choix, sous_reponse: montrerSous ? sous.trim() : "" });
          if (ok && (texte.trim() || choix.length)) setEdition(false);
        }}>
          {q.type === "choix" ? (
            <fieldset className="flex flex-wrap gap-2">
              <legend className="sr-only">{q.texte}</legend>
              {q.choix.map((c) => (
                <label key={c} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm ${choix.includes(c) ? "border-bordeaux bg-bordeaux text-fond" : "border-champ bg-white"}`}>
                  <input type="checkbox" className="sr-only" checked={choix.includes(c)} onChange={() => setChoix(choix.includes(c) ? choix.filter((x) => x !== c) : [...choix, c])} />
                  {c}
                </label>
              ))}
            </fieldset>
          ) : (
            <textarea aria-label={tq.votreReponse} value={texte} onChange={(e) => setTexte(e.target.value)} maxLength={3000} placeholder={tq.votreReponse}
              className="min-h-20 rounded-[10px] border border-champ bg-white px-3 py-2 text-[15px] leading-relaxed focus:border-bordeaux focus:outline-none" />
          )}
          {montrerSous && (
            <label className="flex flex-col gap-1 text-xs text-doux">
              {q.sous_question}
              <textarea value={sous} onChange={(e) => setSous(e.target.value)} maxLength={1000}
                className="min-h-16 rounded-[10px] border border-champ bg-white px-3 py-2 text-[15px] text-encre focus:border-bordeaux focus:outline-none" />
            </label>
          )}
          <div className="flex gap-2">
            <Bouton type="submit" disabled={q.type === "choix" ? choix.length === 0 : !texte.trim()}>{tq.enregistrer}</Bouton>
            {jAiRepondu && <Bouton variante="secondaire" onClick={() => setEdition(false)}>{t.annuler}</Bouton>}
          </div>
        </form>
      ) : (
        <div className={`grid gap-2 ${lesDeux ? "sm:grid-cols-2" : ""}`}>
          <BulleReponse prenom={`${tq.vous} (${moi.prenom})`} r={maReponse} q={q} onModifier={() => setEdition(true)} libelleModifier={t.modifier} />
          {lesDeux && <BulleReponse prenom={prenomAutre} r={saReponse} q={q} />}
        </div>
      )}

      {!lesDeux && (
        <p className="text-xs text-doux">
          {jAiRepondu ? tq.attenteAutre(prenomAutre) : autreARepondu ? <span className="font-semibold text-orange">{tq.vousAttend(prenomAutre)}</span> : autre ? tq.pasEncore : ""}
        </p>
      )}
      {lesDeux && q.verdict && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-doux">{tq.verdict} :</span>
          <Pastille ton={tonVerdict(q.verdict)}>{q.verdict}</Pastille>
        </div>
      )}
    </Carte>
  );
}

function BulleReponse({ prenom, r, q, onModifier, libelleModifier }: { prenom: string; r?: Reponse; q: Question; onModifier?: () => void; libelleModifier?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-fond px-3 py-2.5">
      <span className="flex items-center justify-between text-xs font-semibold text-bordeaux">
        {prenom}
        {onModifier && <button type="button" onClick={onModifier} className="min-h-7 font-semibold underline-offset-4 hover:underline">{libelleModifier}</button>}
      </span>
      <span className="whitespace-pre-line text-sm leading-relaxed">
        {q.type === "choix" ? r?.choix.join(", ") : r?.texte}
        {r?.sous_reponse && <span className="mt-1 block text-doux">{q.sous_question} {r.sous_reponse}</span>}
      </span>
    </div>
  );
}

function QuestionAdmin({ q, n, maries, rep, langue, onVerdict }: {
  q: Question; n: number; maries: Personne[]; rep: (pid?: string) => Reponse | undefined; langue: "fr" | "en"; onVerdict: (v: string) => void;
}) {
  const [libre, setLibre] = useState(q.verdict);
  const lesDeux = maries.length === 2 && maries.every((m) => aRepondu(rep(m.id)));
  return (
    <Carte className="flex flex-col gap-3">
      <p className="text-[15px] font-semibold leading-snug"><span className="text-bordeaux">{n}.</span> {q.texte}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {maries.map((m) => {
          const r = rep(m.id);
          return aRepondu(r) ? <BulleReponse key={m.id} prenom={m.prenom} r={r} q={q} /> : (
            <div key={m.id} className="rounded-xl border border-dashed border-champ px-3 py-2.5 text-xs text-doux">{m.prenom} : pas encore de réponse</div>
          );
        })}
      </div>
      {lesDeux ? (
        <div className="flex flex-col gap-2 border-t border-trait-fin pt-3">
          <span className="text-xs text-doux">Votre verdict (visible des mariés{langue === "en" ? ", espace en anglais" : ""})</span>
          <div className="flex flex-wrap gap-2">
            {VERDICTS[langue].map((v) => (
              <button key={v} type="button" onClick={() => { setLibre(v); onVerdict(v); }}
                className={`min-h-9 rounded-full border px-3 text-xs font-semibold ${q.verdict === v ? "border-bordeaux bg-bordeaux text-fond" : "border-champ bg-white text-encre"}`}>{v}</button>
            ))}
          </div>
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); onVerdict(libre.trim()); }}>
            <input aria-label="Verdict personnalisé" value={libre} onChange={(e) => setLibre(e.target.value)} maxLength={200} placeholder="Ou écrivez votre verdict"
              className="min-h-10 min-w-0 flex-1 rounded-[10px] border border-champ bg-white px-3 text-sm" />
            <Bouton type="submit" variante="contour" className="min-h-10">OK</Bouton>
          </form>
        </div>
      ) : q.verdict ? <Pastille ton={tonVerdict(q.verdict)} className="self-start">{q.verdict}</Pastille> : null}
    </Carte>
  );
}
