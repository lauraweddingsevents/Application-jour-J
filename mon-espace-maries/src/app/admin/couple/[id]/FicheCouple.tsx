"use client";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useState, type ComponentType } from "react";
import { Bouton, Carte, Champ, Chargement, MessageErreur, MessageSucces, Selecteur, TitreCarte, ZoneTexte } from "@/components/ui";
import { exiger, FournisseurEspace, useDonnees, useEspace } from "@/lib/espace";
import { supabaseNavigateur } from "@/lib/supabase/navigateur";
import { dateSuppression, formatDate, formatDateHeure, joursAvant } from "@/lib/calculs";
import { messageErreur } from "@/lib/erreurs";
import { dico } from "@/lib/i18n";
import { notifierServeur } from "@/lib/notifier";
import type { Formule, Personne } from "@/lib/types";
import { Retroplanning } from "@/components/espace/Retroplanning";
import { Budget } from "@/components/espace/Budget";
import { Paiements } from "@/components/espace/Paiements";
import { RendezVous } from "@/components/espace/RendezVous";
import { AFaire, NouvelleTache } from "@/components/espace/AFaire";
import { Prestataires } from "@/components/espace/Prestataires";
import { Documents } from "@/components/espace/Documents";
import { Questionnaire } from "@/components/espace/Questionnaire";
import { Proches } from "@/components/espace/Proches";
import { Deroule } from "@/components/espace/Deroule";
import { Album } from "@/components/espace/Album";

const FORMULES = dico("fr").formules;

const PARTIES: { cle: string; texte: string; composant: ComponentType }[] = [
  { cle: "planning", texte: "Rétroplanning", composant: Retroplanning },
  { cle: "budget", texte: "Budget", composant: Budget },
  { cle: "paiements", texte: "Échéancier", composant: Paiements },
  { cle: "rendez-vous", texte: "Rendez-vous", composant: RendezVous },
  { cle: "a-faire", texte: "À faire (mariés)", composant: AFaire },
  { cle: "prestataires", texte: "Prestataires", composant: Prestataires },
  { cle: "documents", texte: "Documents", composant: Documents },
  { cle: "questionnaire", texte: "Questionnaire", composant: Questionnaire },
  { cle: "proches", texte: "Proches", composant: Proches },
  { cle: "deroule", texte: "Déroulé (Ma Coordo)", composant: Deroule },
  { cle: "album", texte: "Album et QR code", composant: Album },
];

export function FicheCouple() {
  const { id } = useParams<{ id: string }>();
  const base = `/admin/couple/${id}`;
  return (
    <FournisseurEspace
      coupleId={id}
      moi={null}
      admin
      base={base}
      lien={(partie) => (partie ? `${base}?partie=${partie}` : base)}
      chargement={<Chargement />}
      introuvable={<p className="py-16 text-center text-doux">Ce couple n&apos;existe pas ou a été supprimé. <Link href="/admin" className="text-bordeaux underline">Mes couples</Link></p>}
    >
      <Contenu />
    </FournisseurEspace>
  );
}

function Contenu() {
  const { couple, lien } = useEspace();
  const partie = useSearchParams().get("partie") ?? "";
  const Composant = PARTIES.find((p) => p.cle === partie)?.composant;
  const j = joursAvant(couple.date_mariage);

  return (
    <>
      <Link href="/admin" className="inline-flex min-h-8 items-center text-sm font-medium text-bordeaux">‹ Mes couples</Link>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="font-titre text-[30px] font-semibold leading-tight lg:text-4xl">{couple.prenom_1} &amp; {couple.prenom_2}</h1>
          <p className="text-[13px] text-doux">{formatDate(couple.date_mariage)} · {FORMULES[couple.formule]}{couple.lieu ? ` · ${couple.lieu}` : ""}</p>
        </div>
        <span className="font-titre text-[26px] font-semibold text-bordeaux">{j >= 0 ? `J-${j}` : "Passé"}</span>
      </div>

      <nav aria-label="Parties de l'espace" className="-mx-4 mb-5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ul className="flex w-max gap-1.5 sm:w-auto sm:flex-wrap">
          {[{ cle: "", texte: "Fiche" }, ...PARTIES].map((p) => (
            <li key={p.cle}>
              <Link href={lien(p.cle)} aria-current={partie === p.cle ? "page" : undefined}
                className={`inline-flex min-h-9 items-center whitespace-nowrap rounded-full border px-3.5 text-[13px] font-medium ${partie === p.cle ? "border-bordeaux bg-bordeaux text-fond" : "border-champ bg-carte"}`}>
                {p.texte}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {Composant ? <Composant /> : <Fiche />}
    </>
  );
}

function Fiche() {
  const { couple } = useEspace();
  return (
    <div className="grid gap-4 xl:grid-cols-2 xl:items-start">
      <div className="flex flex-col gap-4">
        <InfosCouple key={couple.id + couple.formule + couple.date_mariage} />
        <NotesPrivees />
      </div>
      <div className="flex flex-col gap-4">
        <NouvelleTache onAjouter={async (v) => {
          const { error } = await supabaseNavigateur().from("taches").insert({ couple_id: couple.id, ...v });
          if (!error) notifierServeur();
          return !error;
        }} />
        <AccesDonnees />
      </div>
    </div>
  );
}

function InfosCouple() {
  const { couple, maries, rechargerCouple } = useEspace();
  const [v, setV] = useState({ prenom_1: couple.prenom_1, prenom_2: couple.prenom_2, date_mariage: couple.date_mariage, lieu: couple.lieu, formule: couple.formule as Formule, langue: couple.langue });
  const [personnes, setPersonnes] = useState(maries.map((m) => ({ ...m })));
  const [ajout, setAjout] = useState({ prenom: couple.prenom_2, email: "" });
  const [message, setMessage] = useState("");
  const [erreur, setErreur] = useState("");
  const champ = (cle: keyof typeof v) => ({ value: v[cle], onChange: (e: { target: { value: string } }) => setV({ ...v, [cle]: e.target.value }) });

  async function enregistrer() {
    setMessage("");
    setErreur("");
    try {
      const sb = supabaseNavigateur();
      await exiger(sb.from("couples").update({ ...v, prenom_1: v.prenom_1.trim(), prenom_2: v.prenom_2.trim(), lieu: v.lieu.trim() }).eq("id", couple.id));
      for (const p of personnes) {
        const avant = maries.find((m) => m.id === p.id);
        if (avant && (avant.prenom !== p.prenom || avant.email !== p.email || avant.telephone !== p.telephone)) {
          await exiger(sb.from("personnes").update({ prenom: p.prenom.trim(), email: p.email.trim(), telephone: p.telephone.trim() }).eq("id", p.id));
        }
      }
      if (ajout.email.trim()) {
        await exiger(sb.rpc("ajouter_marie", { p_couple: couple.id, p_prenom: ajout.prenom, p_email: ajout.email }));
        setAjout({ prenom: "", email: "" });
      }
      await rechargerCouple();
      setMessage(v.formule !== couple.formule ? "Enregistré. Les droits des mariés suivent la nouvelle formule." : "Enregistré.");
    } catch (e) {
      setErreur(messageErreur(e as Error));
    }
  }

  return (
    <Carte>
      <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); enregistrer(); }}>
        <TitreCarte>Fiche du couple</TitreCarte>
        <div className="grid grid-cols-2 gap-3">
          <Champ id="fc-p1" libelle="Mariée / marié 1" required maxLength={80} {...champ("prenom_1")} />
          <Champ id="fc-p2" libelle="Mariée / marié 2" required maxLength={80} {...champ("prenom_2")} />
          <Champ id="fc-date" libelle="Date" type="date" required {...champ("date_mariage")} />
          <Champ id="fc-lieu" libelle="Lieu" maxLength={200} {...champ("lieu")} />
          <Selecteur id="fc-formule" libelle="Formule" {...champ("formule")} options={Object.entries(FORMULES).map(([valeur, texte]) => ({ valeur, texte }))} />
          <Selecteur id="fc-langue" libelle="Langue de l'espace" {...champ("langue")} options={[{ valeur: "fr", texte: "Français" }, { valeur: "en", texte: "English" }]} />
        </div>
        {personnes.map((p, i) => (
          <fieldset key={p.id} className="grid grid-cols-1 gap-3 rounded-xl bg-fond p-3 sm:grid-cols-3">
            <legend className="sr-only">Accès {i + 1}</legend>
            <Champ id={`fp-p${i}`} libelle="Prénom" value={p.prenom} maxLength={80} onChange={(e) => setPersonnes(personnes.map((x) => (x.id === p.id ? { ...x, prenom: e.target.value } : x)))} />
            <Champ id={`fp-e${i}`} libelle="E-mail de connexion" type="email" value={p.email} maxLength={200} disabled={!!p.user_id}
              aide={p.user_id ? "Déjà utilisé pour se connecter" : undefined}
              onChange={(e) => setPersonnes(personnes.map((x) => (x.id === p.id ? { ...x, email: e.target.value } : x)))} />
            <Champ id={`fp-t${i}`} libelle="Téléphone" type="tel" value={p.telephone} maxLength={40} onChange={(e) => setPersonnes(personnes.map((x) => (x.id === p.id ? { ...x, telephone: e.target.value } : x)))} />
          </fieldset>
        ))}
        {personnes.length < 2 && (
          <fieldset className="grid grid-cols-1 gap-3 rounded-xl border border-dashed border-champ p-3 sm:grid-cols-2">
            <legend className="px-1 text-xs text-doux">Ajouter le second accès</legend>
            <Champ id="fa-p" libelle="Prénom" value={ajout.prenom} maxLength={80} onChange={(e) => setAjout({ ...ajout, prenom: e.target.value })} />
            <Champ id="fa-e" libelle="E-mail" type="email" value={ajout.email} maxLength={200} onChange={(e) => setAjout({ ...ajout, email: e.target.value })} />
          </fieldset>
        )}
        <MessageErreur>{erreur}</MessageErreur>
        <MessageSucces>{message}</MessageSucces>
        <Bouton type="submit" className="self-start">Enregistrer</Bouton>
      </form>
    </Carte>
  );
}

function NotesPrivees() {
  const { couple } = useEspace();
  const { donnees, recharger } = useDonnees(
    () => exiger(supabaseNavigateur().from("couples_prives").select("notes, lien_ma_coordo").eq("couple_id", couple.id).maybeSingle()) as Promise<{ notes: string; lien_ma_coordo: string } | null>,
    [couple.id],
  );
  if (donnees === undefined) return null;
  return <FormNotes key={JSON.stringify(donnees)} initial={donnees ?? { notes: "", lien_ma_coordo: "" }} onFini={recharger} />;
}

function FormNotes({ initial, onFini }: { initial: { notes: string; lien_ma_coordo: string }; onFini: () => void }) {
  const { couple } = useEspace();
  const [v, setV] = useState(initial);
  const [message, setMessage] = useState("");
  const [erreur, setErreur] = useState("");
  return (
    <Carte>
      <form className="flex flex-col gap-3" onSubmit={async (e) => {
        e.preventDefault();
        setMessage("");
        const lien = v.lien_ma_coordo.trim();
        if (lien && !/\/j\/[A-Za-z0-9]+/.test(lien)) return setErreur("Collez le lien personnel complet, du type https://…/j/xxxx");
        const { error } = await supabaseNavigateur().from("couples_prives").upsert({ couple_id: couple.id, notes: v.notes, lien_ma_coordo: lien });
        if (error) return setErreur(messageErreur(error));
        setErreur("");
        setMessage("Enregistré.");
        onFini();
      }}>
        <TitreCarte>Notes privées</TitreCarte>
        <ZoneTexte id="np-notes" libelle="Jamais visibles par les mariés" value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} maxLength={10000} />
        <Champ id="np-coordo" libelle="Lien Ma Coordo du déroulé" value={v.lien_ma_coordo} onChange={(e) => setV({ ...v, lien_ma_coordo: e.target.value })} maxLength={500}
          placeholder="https://ma-coordo.vercel.app/j/…"
          aide="Dans Ma Coordo : ajoutez « Les mariés » comme intervenant (catégorie proche), puis copiez son lien personnel ici." />
        {v.lien_ma_coordo && <a href={v.lien_ma_coordo.replace(/\/j\/.*/, "/tableau")} target="_blank" rel="noreferrer" className="text-sm font-semibold text-bordeaux">Ouvrir Ma Coordo ›</a>}
        <MessageErreur>{erreur}</MessageErreur>
        <MessageSucces>{message}</MessageSucces>
        <Bouton type="submit" variante="contour" className="self-start">Enregistrer</Bouton>
      </form>
    </Carte>
  );
}

function AccesDonnees() {
  const { couple, maries } = useEspace();
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [erreur, setErreur] = useState("");
  const [enCours, setEnCours] = useState("");

  async function appel(action: string, url: string, corps: object) {
    setEnCours(action);
    setMessage("");
    setErreur("");
    try {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corps) });
      const json = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(json.erreur ?? "Action impossible");
      return json;
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnCours("");
    }
  }

  return (
    <Carte className="flex flex-col gap-2.5">
      <TitreCarte>Accès et données</TitreCarte>
      <p className="text-[13px]">Connexion par lien envoyé par e-mail, sans mot de passe.</p>
      <ul className="text-xs text-doux">
        {maries.map((m: Personne) => (
          <li key={m.id}>Dernière connexion de {m.prenom || m.email} : {m.derniere_connexion ? formatDateHeure(m.derniere_connexion) : "jamais"}</li>
        ))}
      </ul>
      <Bouton variante="contour" className="self-start" disabled={!!enCours} onClick={async () => {
        const r = await appel("inviter", "/api/admin/inviter", { couple: couple.id });
        if (r) setMessage(r.envoyes ? `Lien de connexion renvoyé (${r.envoyes} e-mail${r.envoyes > 1 ? "s" : ""}).` : "Aucun e-mail envoyé : vérifiez les réglages d'envoi.");
      }}>{enCours === "inviter" ? "Envoi…" : "Renvoyer le lien de connexion"}</Bouton>
      <div className="my-1 h-px bg-trait-fin" />
      <p className="text-[13px]">Données conservées jusqu&apos;au {formatDate(dateSuppression(couple.date_mariage))}, puis supprimées automatiquement (6 mois après le mariage).</p>
      <div className="flex flex-wrap gap-2">
        <a href={`/api/admin/export?couple=${couple.id}`} className="inline-flex min-h-11 items-center rounded-xl border border-champ bg-white px-4 text-sm font-medium">Exporter les données</a>
        <Bouton variante="danger" disabled={!!enCours} onClick={async () => {
          if (!confirm(`Supprimer maintenant tout l'espace de ${couple.prenom_1} & ${couple.prenom_2} (fiche, documents, photos, accès) ? Cette action est définitive.`)) return;
          const r = await appel("supprimer", "/api/admin/supprimer", { couple: couple.id });
          if (r) router.replace("/admin");
        }}>{enCours === "supprimer" ? "Suppression…" : "Supprimer maintenant"}</Bouton>
      </div>
      <MessageErreur>{erreur}</MessageErreur>
      <MessageSucces>{message}</MessageSucces>
    </Carte>
  );
}
