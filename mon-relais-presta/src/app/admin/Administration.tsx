"use client";
import { useCallback, useEffect, useState } from "react";
import { Bouton } from "@/components/ui/Bouton";
import { Carte } from "@/components/ui/Carte";
import { Champ } from "@/components/ui/Champ";
import Link from "next/link";
import { Statistiques } from "./Statistiques";
import { useMembre, nomMetier } from "@/lib/membre";
import { supabaseNavigateur } from "@/lib/supabase/navigateur";
import { messageErreur } from "@/lib/erreurs";
import { notifier } from "@/lib/notifier";
import { libelleDepartement, nomZone, ZONES, type Zone } from "@/lib/zones";
import type { MembreAdmin, StatutMembre } from "@/lib/types";

type Onglet = "statistiques" | "inscriptions" | "membres" | "signalements" | "metiers" | "charte";

export function Administration() {
  const [onglet, setOnglet] = useState<Onglet>("statistiques");
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-light">Administration</h1>
      <nav className="flex flex-wrap gap-2" aria-label="Rubriques">
        {([
          ["statistiques", "Statistiques"],
          ["inscriptions", "À valider"],
          ["membres", "Membres"],
          ["signalements", "Signalements"],
          ["metiers", "Métiers"],
          ["charte", "Charte"],
        ] as [Onglet, string][]).map(([v, t]) => (
          <button key={v} type="button" aria-pressed={onglet === v} onClick={() => setOnglet(v)}
            className={`min-h-[44px] rounded-full border px-4 text-sm font-medium ${onglet === v ? "border-or bg-or text-blanc" : "border-or-clair bg-blanc"}`}>
            {t}
          </button>
        ))}
      </nav>
      {(onglet === "inscriptions" || onglet === "membres") && <Membres enAttente={onglet === "inscriptions"} />}
      {onglet === "statistiques" && <Statistiques />}
      {onglet === "signalements" && <Signalements />}
      {onglet === "metiers" && <Metiers />}
      {onglet === "charte" && <EditionCharte />}
    </div>
  );
}

// ---------------- Membres et inscriptions ----------------
const LIBELLES_STATUT: Record<StatutMembre, string> = {
  en_attente: "En attente",
  valide: "Validé",
  refuse: "Refusé",
  suspendu: "Suspendu",
};

function Membres({ enAttente }: { enAttente: boolean }) {
  const { metiers, membre: moi } = useMembre();
  const [liste, setListe] = useState<MembreAdmin[] | null>(null);
  const [recherche, setRecherche] = useState("");
  const [erreur, setErreur] = useState("");

  const charger = useCallback(async () => {
    const { data, error } = await supabaseNavigateur().rpc("admin_membres");
    if (error) setErreur(messageErreur(error));
    setListe((data as MembreAdmin[]) ?? []);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    charger();
  }, [charger]);

  async function changerStatut(m: MembreAdmin, statut: StatutMembre) {
    let motif = "";
    if (statut === "suspendu" || statut === "refuse") {
      const r = window.prompt(statut === "suspendu" ? "Motif de la suspension (visible par vous seule) :" : "Motif du refus (facultatif) :", "");
      if (r === null) return;
      motif = r;
    }
    const { error } = await supabaseNavigateur().rpc("admin_changer_statut", { p_membre: m.id, p_statut: statut, p_motif: motif });
    if (error) return setErreur(messageErreur(error));
    notifier();
    await charger();
  }

  async function changerRole(m: MembreAdmin, role: "membre" | "admin", zones: Zone[] = []) {
    const { error } = await supabaseNavigateur().rpc("admin_changer_role", { p_membre: m.id, p_role: role, p_admin_zones: zones });
    if (error) return setErreur(messageErreur(error));
    await charger();
  }

  if (!liste) return <p className="text-encre-doux">Chargement…</p>;
  const q = recherche.trim().toLowerCase();
  const affiches = liste
    .filter((m) => (enAttente ? m.statut === "en_attente" : m.statut !== "en_attente"))
    .filter((m) => !q || [m.nom, m.entreprise, m.email, nomMetier(metiers, m.metier_id)].join(" ").toLowerCase().includes(q));

  return (
    <div className="flex flex-col gap-3">
      {erreur && <p className="text-sm text-alerte">{erreur}</p>}
      {!enAttente && (
        <Champ id="recherche" libelle="Rechercher" placeholder="Nom, entreprise, e-mail, métier…" value={recherche}
          onChange={(e) => setRecherche(e.target.value)} />
      )}
      {affiches.length === 0 && (
        <Carte className="text-encre-doux">{enAttente ? "Aucune inscription en attente." : "Aucun membre."}</Carte>
      )}
      {affiches.map((m) => (
        <Carte key={m.id} className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium">{m.nom}{m.entreprise && <span className="font-normal text-encre-doux"> · {m.entreprise}</span>}</p>
              <p className="text-sm text-encre-doux">{nomMetier(metiers, m.metier_id)} · {m.zones.map(nomZone).join(" + ")}</p>
            </div>
            <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
              m.statut === "valide" ? "bg-succes/15 text-succes" : m.statut === "en_attente" ? "bg-or-clair/50 text-or-fonce" : "bg-alerte/10 text-alerte"
            }`}>
              {LIBELLES_STATUT[m.statut]}{m.role === "admin" ? " · admin" : ""}
            </span>
          </div>
          <div className="text-sm">
            <a href={`mailto:${m.email}`} className="text-or-fonce underline underline-offset-4">{m.email}</a>
            {m.lien && <p className="mt-1 break-all text-encre-doux">{m.lien}</p>}
            <p className="mt-1 text-encre-doux">{m.departements.map(libelleDepartement).join(", ")}</p>
            {m.motif_statut && <p className="mt-1 italic text-encre-doux">Motif : {m.motif_statut}</p>}
            <p className="mt-1 text-xs text-encre-doux">Inscrit le {new Date(m.cree_le).toLocaleDateString("fr-FR")}</p>
          </div>
          {m.id !== moi?.id && (
            <div className="flex flex-wrap gap-2">
              {m.statut !== "valide" && <Bouton className="flex-1" onClick={() => changerStatut(m, "valide")}>{m.statut === "suspendu" ? "Réactiver" : "Valider"}</Bouton>}
              {m.statut === "en_attente" && <Bouton variante="secondaire" className="flex-1" onClick={() => changerStatut(m, "refuse")}>Refuser</Bouton>}
              {m.statut === "valide" && <Bouton variante="secondaire" className="flex-1" onClick={() => changerStatut(m, "suspendu")}>Suspendre</Bouton>}
              {m.statut === "valide" && (
                <RoleAdmin m={m} onChange={changerRole} />
              )}
            </div>
          )}
        </Carte>
      ))}
    </div>
  );
}

// Nommer un administrateur (pour toutes les zones ou une seule communauté)
function RoleAdmin({ m, onChange }: { m: MembreAdmin; onChange: (m: MembreAdmin, r: "membre" | "admin", z?: Zone[]) => void }) {
  const [ouvert, setOuvert] = useState(false);
  if (m.role === "admin")
    return (
      <Bouton variante="discret" className="w-full" onClick={() => onChange(m, "membre")}>
        Retirer le rôle d&apos;administrateur{m.admin_zones.length ? ` (${m.admin_zones.map(nomZone).join(", ")})` : ""}
      </Bouton>
    );
  if (!ouvert) return <Bouton variante="discret" className="w-full" onClick={() => setOuvert(true)}>Nommer administrateur…</Bouton>;
  return (
    <div className="flex w-full flex-col gap-2 rounded-2xl bg-creme-fonce/60 p-3">
      <p className="text-sm">Administrateur pour :</p>
      <Bouton variante="secondaire" onClick={() => onChange(m, "admin", [])}>Toutes les zones</Bouton>
      {ZONES.map((z) => (
        <Bouton key={z.code} variante="secondaire" onClick={() => onChange(m, "admin", [z.code])}>{z.communaute} ({z.nom}) uniquement</Bouton>
      ))}
      <Bouton variante="discret" onClick={() => setOuvert(false)}>Annuler</Bouton>
    </div>
  );
}

// ---------------- Métiers ----------------
function Metiers() {
  const { metiers, recharger } = useMembre();
  const [nouveau, setNouveau] = useState("");
  const [erreur, setErreur] = useState("");

  async function enregistrer(id: number | null, nom: string, ordre: number | null, actif: boolean) {
    setErreur("");
    const { error } = await supabaseNavigateur().rpc("admin_enregistrer_metier", { p_id: id, p_nom: nom, p_ordre: ordre, p_actif: actif });
    if (error) return setErreur(messageErreur(error));
    await recharger();
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-encre-doux">
        Un métier désactivé n&apos;est plus proposé, mais reste affiché sur les fiches et demandes existantes.
      </p>
      {erreur && <p className="text-sm text-alerte">{erreur}</p>}
      {metiers.map((m) => (
        <LigneMetier key={m.id} nom={m.nom} actif={m.actif}
          onRenommer={(nom) => enregistrer(m.id, nom, null, m.actif)}
          onBasculer={() => enregistrer(m.id, m.nom, null, !m.actif)} />
      ))}
      <Carte>
        <form className="flex flex-col gap-3" onSubmit={async (e) => { e.preventDefault(); if (nouveau.trim()) { await enregistrer(null, nouveau, 50, true); setNouveau(""); } }}>
          <Champ id="nouveau-metier" libelle="Ajouter un métier" value={nouveau} onChange={(e) => setNouveau(e.target.value)} />
          <Bouton type="submit" variante="secondaire" disabled={nouveau.trim().length < 2}>Ajouter</Bouton>
        </form>
      </Carte>
    </div>
  );
}

function LigneMetier({ nom, actif, onRenommer, onBasculer }: { nom: string; actif: boolean; onRenommer: (n: string) => void; onBasculer: () => void }) {
  const [valeur, setValeur] = useState(nom);
  return (
    <div className={`flex items-center gap-2 rounded-2xl bg-blanc p-2 ring-1 ring-or-clair/40 ${actif ? "" : "opacity-60"}`}>
      <input aria-label="Nom du métier" className="min-h-[44px] min-w-0 flex-1 rounded-xl px-3 focus:outline-or" value={valeur}
        onChange={(e) => setValeur(e.target.value)} onBlur={() => valeur.trim() && valeur !== nom && onRenommer(valeur)} />
      <button type="button" onClick={onBasculer} className="min-h-[44px] shrink-0 rounded-full border border-or-clair px-3 text-sm">
        {actif ? "Désactiver" : "Réactiver"}
      </button>
    </div>
  );
}

// ---------------- Charte ----------------
function EditionCharte() {
  const { recharger } = useMembre();
  const [texte, setTexte] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [message, setMessage] = useState("");

  useEffect(() => {
    supabaseNavigateur().from("charte").select("texte, version").eq("id", 1).maybeSingle().then(({ data }) => {
      setTexte(data?.texte ?? "");
      setVersion(data?.version ?? 0);
    });
  }, []);

  if (texte === null) return <p className="text-encre-doux">Chargement…</p>;
  return (
    <Carte className="flex flex-col gap-4">
      <p className="text-sm text-encre-doux">
        Version {version}. Après modification, chaque membre devra relire et accepter la nouvelle version à sa
        prochaine visite.
      </p>
      <textarea aria-label="Texte de la charte" rows={18} value={texte} onChange={(e) => { setTexte(e.target.value); setMessage(""); }}
        className="rounded-2xl border border-or-clair bg-blanc p-4 text-sm leading-relaxed focus:border-or focus:outline-none" />
      {message && <p className="text-sm text-encre-doux">{message}</p>}
      <Bouton
        disabled={texte.trim().length < 20}
        onClick={async () => {
          if (!window.confirm("Publier cette nouvelle version ? Tous les membres devront l'accepter à nouveau.")) return;
          const { data, error } = await supabaseNavigateur().rpc("admin_modifier_charte", { p_texte: texte });
          if (error) return setMessage(messageErreur(error));
          setVersion(data as number);
          setMessage("Nouvelle version publiée.");
          await recharger();
        }}
      >
        Publier la nouvelle version
      </Bouton>
    </Carte>
  );
}

// ---------------- Signalements ----------------
type Signalement = {
  id: number;
  cible: "demande" | "membre";
  motif: string;
  cree_le: string;
  traite_le: string | null;
  decision: string;
  auteur: { id: string; nom: string };
  demande: { id: string; lieu: string; date_mariage: string; metier_id: number; statut: string; auteur_id: string; auteur_nom: string } | null;
  membre: { id: string; nom: string; statut: string } | null;
};

function Signalements() {
  const { metiers } = useMembre();
  const [liste, setListe] = useState<Signalement[] | null>(null);
  const [erreur, setErreur] = useState("");

  const charger = useCallback(async () => {
    const { data, error } = await supabaseNavigateur().rpc("admin_signalements");
    if (error) setErreur(messageErreur(error));
    setListe((data as Signalement[]) ?? []);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    charger();
  }, [charger]);

  async function appeler(rpc: string, args: Record<string, unknown>) {
    setErreur("");
    const { error } = await supabaseNavigateur().rpc(rpc, args);
    if (error) return setErreur(messageErreur(error));
    notifier();
    await charger();
  }

  if (!liste) return <p className="text-encre-doux">Chargement…</p>;
  return (
    <div className="flex flex-col gap-3">
      {erreur && <p className="text-sm text-alerte">{erreur}</p>}
      {liste.length === 0 && <Carte className="text-encre-doux">Aucun signalement.</Carte>}
      {liste.map((s) => (
        <Carte key={s.id} className={`flex flex-col gap-2 ${s.traite_le ? "opacity-60" : ""}`}>
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium">
              {s.cible === "demande" ? "Demande" : "Profil"} :{" "}
              {s.demande && (
                <Link href={`/demande/${s.demande.id}`} className="text-or-fonce underline underline-offset-4">
                  {nomMetier(metiers, s.demande.metier_id)} · {s.demande.lieu}
                </Link>
              )}
              {s.membre && <Link href={`/membre/${s.membre.id}`} className="text-or-fonce underline underline-offset-4">{s.membre.nom}</Link>}
            </p>
            <span className="shrink-0 text-xs text-encre-doux">{new Date(s.cree_le).toLocaleDateString("fr-FR")}</span>
          </div>
          {s.demande && <p className="text-sm text-encre-doux">Déposée par {s.demande.auteur_nom} · statut {s.demande.statut}</p>}
          <p className="rounded-xl bg-creme-fonce/50 p-3">« {s.motif} »</p>
          <p className="text-sm text-encre-doux">Signalé par {s.auteur.nom}</p>
          {s.traite_le ? (
            <p className="text-sm text-succes">✓ Traité le {new Date(s.traite_le).toLocaleDateString("fr-FR")}{s.decision && ` : ${s.decision}`}</p>
          ) : (
            <div className="flex flex-col gap-2">
              {s.demande && s.demande.statut !== "annulee" && (
                <Bouton variante="secondaire" onClick={() => window.confirm("Retirer cette demande (statut Annulée) ?") && appeler("admin_annuler_demande", { p_id: s.demande!.id })}>
                  Retirer la demande
                </Bouton>
              )}
              {s.membre && s.membre.statut === "valide" && (
                <Bouton variante="secondaire" onClick={() => {
                  const motif = window.prompt("Motif de la suspension :", s.motif);
                  if (motif !== null) appeler("admin_changer_statut", { p_membre: s.membre!.id, p_statut: "suspendu", p_motif: motif });
                }}>
                  Suspendre {s.membre.nom}
                </Bouton>
              )}
              {s.demande && (
                <Bouton variante="secondaire" onClick={() => {
                  const motif = window.prompt(`Motif de la suspension de ${s.demande!.auteur_nom} :`, s.motif);
                  if (motif !== null) appeler("admin_changer_statut", { p_membre: s.demande!.auteur_id, p_statut: "suspendu", p_motif: motif });
                }}>
                  Suspendre l&apos;auteur ({s.demande.auteur_nom})
                </Bouton>
              )}
              <Bouton onClick={() => {
                const decision = window.prompt("Note de traitement (facultatif) :", "");
                if (decision !== null) appeler("admin_traiter_signalement", { p_id: s.id, p_decision: decision });
              }}>
                Marquer comme traité
              </Bouton>
            </div>
          )}
        </Carte>
      ))}
    </div>
  );
}
