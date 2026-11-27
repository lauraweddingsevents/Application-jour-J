"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BarreProgression, Bouton, Carte, Champ, Chargement, EnTetePage, MessageErreur, MessageSucces, Pastille, Selecteur, Vide } from "@/components/ui";
import { exiger, useDonnees } from "@/lib/espace";
import { supabaseNavigateur } from "@/lib/supabase/navigateur";
import { aujourdhuiParis, avancement, formatDate, joursAvant, statutEtape, type Statut } from "@/lib/calculs";
import { messageErreur } from "@/lib/erreurs";
import { dico } from "@/lib/i18n";
import type { Couple, Formule } from "@/lib/types";

const FORMULES = dico("fr").formules;
type Filtre = "tous" | "complete" | "coordination";
type ATraiter = { quoi: string; couple: Couple; partie: string };

async function charger() {
  const sb = supabaseNavigateur();
  const [couples, etapes, echeances, documents, questions, taches] = await Promise.all([
    exiger(sb.from("couples").select("*").order("date_mariage")),
    exiger(sb.from("etapes").select("id, couple_id, parent_id, statut")),
    exiger(sb.from("echeances").select("couple_id, libelle").eq("statut", "a_confirmer")),
    exiger(sb.from("documents").select("couple_id, nom").eq("statut", "en_relecture")),
    exiger(sb.from("questions").select("couple_id, verdict").eq("verdict", "")),
    exiger(sb.from("taches").select("couple_id, intitule, date_butoir").is("fait_le", null).lt("date_butoir", aujourdhuiParis())),
  ]);
  return {
    couples: couples as Couple[],
    etapes: etapes as { id: string; couple_id: string; parent_id: string | null; statut: Statut }[],
    echeances: (echeances ?? []) as { couple_id: string; libelle: string }[],
    documents: (documents ?? []) as { couple_id: string; nom: string }[],
    questions: (questions ?? []) as { couple_id: string; verdict: string }[],
    taches: (taches ?? []) as { couple_id: string; intitule: string }[],
  };
}

export default function MesCouples() {
  const { donnees, erreur, recharger } = useDonnees(charger, []);
  const [filtre, setFiltre] = useState<Filtre>("tous");
  const [formulaire, setFormulaire] = useState(false);
  const [message, setMessage] = useState("");

  if (!donnees) return <><EnTetePage titre="Mes couples" /><MessageErreur>{erreur}</MessageErreur>{!erreur && <Chargement />}</>;
  const { couples, etapes } = donnees;
  const aVenir = couples.filter((c) => joursAvant(c.date_mariage) >= -1);
  const passes = couples.filter((c) => joursAvant(c.date_mariage) < -1).reverse();

  const avancementCouple = (id: string) => {
    const miennes = etapes.filter((e) => e.couple_id === id);
    return avancement(miennes.filter((e) => !e.parent_id).map((e) => statutEtape(e.statut, miennes.filter((s) => s.parent_id === e.id).map((s) => s.statut))));
  };
  const parId = new Map(couples.map((c) => [c.id, c]));
  const aTraiter: ATraiter[] = [
    ...donnees.echeances.map((e) => ({ quoi: `Virement à confirmer (${e.libelle})`, couple: parId.get(e.couple_id)!, partie: "paiements" })),
    ...donnees.documents.map((d) => ({ quoi: `Document à relire : ${d.nom}`, couple: parId.get(d.couple_id)!, partie: "documents" })),
    ...couples.filter((c) => c.questionnaire_termine_le && donnees.questions.some((q) => q.couple_id === c.id)).map((c) => ({ quoi: "Questionnaire terminé : verdicts à poser", couple: c, partie: "questionnaire" })),
    ...donnees.taches.map((x) => ({ quoi: `Tâche en retard : ${x.intitule}`, couple: parId.get(x.couple_id)!, partie: "a-faire" })),
  ].filter((x) => x.couple);
  const alerte = (id: string) => aTraiter.find((x) => x.couple.id === id)?.quoi;
  const filtrer = (c: Couple) => filtre === "tous" || (filtre === "complete" ? c.formule === "complete" : c.formule !== "complete");

  return (
    <>
      <EnTetePage
        titre="Mes couples"
        intro={`${aVenir.length} mariage${aVenir.length > 1 ? "s" : ""} en cours`}
        action={<Bouton onClick={() => { setFormulaire(!formulaire); setMessage(""); }}>{formulaire ? "Fermer" : "+ Couple"}</Bouton>}
      />
      <MessageSucces>{message}</MessageSucces>
      {formulaire && <NouveauCouple onCree={(m) => { setFormulaire(false); setMessage(m); recharger(); }} />}

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px] lg:items-start">
        <div className="flex flex-col gap-3 lg:order-2">
          <section className="flex flex-col gap-2 rounded-2xl bg-bordeaux p-4 text-fond">
            <h2 className="text-xs font-semibold uppercase tracking-[0.1em] opacity-85">À traiter</h2>
            {aTraiter.length === 0 && <p className="text-sm opacity-85">Rien en attente. Tout est à jour.</p>}
            {aTraiter.map((x, i) => (
              <Link key={i} href={`/admin/couple/${x.couple.id}?partie=${x.partie}`} className="flex justify-between gap-3 rounded-lg py-1 text-[13px] hover:underline">
                <span>{x.quoi}</span>
                <span className="whitespace-nowrap opacity-85">{x.couple.prenom_1} &amp; {x.couple.prenom_2}</span>
              </Link>
            ))}
          </section>
        </div>

        <div className="flex flex-col gap-3 lg:order-1">
          <div className="flex flex-wrap gap-2">
            {([["tous", "Tous"], ["complete", "Organisation complète"], ["coordination", "Coordination"]] as const).map(([v, texte]) => (
              <button key={v} type="button" onClick={() => setFiltre(v)} aria-pressed={filtre === v}
                className={`min-h-9 rounded-full border px-3.5 text-[13px] font-medium ${filtre === v ? "border-bordeaux bg-bordeaux text-fond" : "border-champ bg-carte"}`}>{texte}</button>
            ))}
          </div>
          {aVenir.filter(filtrer).length === 0 && <Vide>Aucun couple pour le moment. Ajoutez votre premier couple avec « + Couple ».</Vide>}
          <div className="grid gap-3 xl:grid-cols-2">
            {aVenir.filter(filtrer).map((c) => <CarteCouple key={c.id} c={c} pct={avancementCouple(c.id)} alerte={alerte(c.id)} />)}
          </div>
          {passes.filter(filtrer).length > 0 && (
            <details className="mt-3">
              <summary className="min-h-11 cursor-pointer py-2 font-titre text-xl font-semibold">Mariages passés ({passes.filter(filtrer).length})</summary>
              <div className="mt-2 grid gap-3 xl:grid-cols-2">
                {passes.filter(filtrer).map((c) => <CarteCouple key={c.id} c={c} pct={avancementCouple(c.id)} alerte={alerte(c.id)} />)}
              </div>
            </details>
          )}
        </div>
      </div>
    </>
  );
}

function CarteCouple({ c, pct, alerte }: { c: Couple; pct: number; alerte?: string }) {
  const j = joursAvant(c.date_mariage);
  return (
    <Link href={`/admin/couple/${c.id}`} className="flex flex-col gap-2.5 rounded-[14px] border border-trait bg-carte p-3.5 hover:border-bordeaux">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-[15px] font-semibold">{c.prenom_1} &amp; {c.prenom_2}</span>
          <span className="text-xs text-doux">{formatDate(c.date_mariage)} · {FORMULES[c.formule]}{c.langue === "en" ? " · English" : ""}</span>
        </div>
        <span className="whitespace-nowrap font-titre text-[22px] font-semibold text-bordeaux">{j >= 0 ? `J-${j}` : "Passé"}</span>
      </div>
      <div className="flex items-center gap-2.5">
        <BarreProgression pourcentage={pct} className="flex-1" />
        <span className="w-10 text-right text-xs text-doux">{pct} %</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {!c.invitation_envoyee_le && <Pastille ton="bordeaux">Invitation à envoyer</Pastille>}
        {alerte && <Pastille ton="orange">{alerte}</Pastille>}
      </div>
    </Link>
  );
}

function NouveauCouple({ onCree }: { onCree: (message: string) => void }) {
  const router = useRouter();
  const [v, setV] = useState({ prenom_1: "", prenom_2: "", date: "", lieu: "", formule: "complete" as Formule, langue: "fr", email_1: "", email_2: "" });
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState("");
  const champ = (cle: keyof typeof v) => ({ value: v[cle], onChange: (e: { target: { value: string } }) => setV({ ...v, [cle]: e.target.value }) });

  async function creer() {
    setEnCours(true);
    setErreur("");
    try {
      const { data, error } = await supabaseNavigateur().rpc("creer_couple", {
        p_prenom_1: v.prenom_1, p_prenom_2: v.prenom_2, p_date: v.date, p_lieu: v.lieu, p_formule: v.formule,
        p_langue: v.langue, p_email_1: v.email_1, p_email_2: v.email_2,
      });
      if (error) throw error;
      // Aucun e-mail aux mariés à ce stade : Laura prépare l'espace, puis envoie l'invitation depuis la fiche
      router.push(`/admin/couple/${data}?nouveau=1`);
      onCree("Espace créé, avec le rétroplanning type, le budget type et le questionnaire.");
    } catch (e) {
      setErreur(messageErreur(e as Error));
    } finally {
      setEnCours(false);
    }
  }

  return (
    <Carte className="mb-2">
      <form className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); creer(); }}>
        <p className="font-titre text-[22px] font-semibold sm:col-span-2">Nouveau couple</p>
        <Champ id="nc-p1" libelle="Prénom de la mariée / du marié 1" required maxLength={80} {...champ("prenom_1")} />
        <Champ id="nc-p2" libelle="Prénom de la mariée / du marié 2" required maxLength={80} {...champ("prenom_2")} />
        <Champ id="nc-date" libelle="Date du mariage" type="date" required {...champ("date")} />
        <Champ id="nc-lieu" libelle="Lieu" maxLength={200} {...champ("lieu")} />
        <Selecteur id="nc-formule" libelle="Formule" {...champ("formule")} options={Object.entries(FORMULES).map(([valeur, texte]) => ({ valeur, texte }))} />
        <Selecteur id="nc-langue" libelle="Langue de l'espace" {...champ("langue")} options={[{ valeur: "fr", texte: "Français" }, { valeur: "en", texte: "English" }]} />
        <Champ id="nc-e1" libelle={`E-mail de ${v.prenom_1 || "la mariée / du marié 1"}`} type="email" required maxLength={200} {...champ("email_1")} />
        <Champ id="nc-e2" libelle={`E-mail de ${v.prenom_2 || "la mariée / du marié 2"}`} type="email" maxLength={200} aide="Chacun a son propre accès (nécessaire pour le questionnaire)." {...champ("email_2")} />
        <div className="flex flex-col gap-2 sm:col-span-2">
          <MessageErreur>{erreur}</MessageErreur>
          <Bouton type="submit" disabled={enCours} className="min-h-12 sm:self-start">{enCours ? "Création…" : "Créer l'espace"}</Bouton>
          <p className="text-xs text-doux">Aucun e-mail n&apos;est envoyé aux mariés : vous préparez leur espace, puis vous les invitez depuis leur fiche quand il est prêt.</p>
        </div>
      </form>
    </Carte>
  );
}
