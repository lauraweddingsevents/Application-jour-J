import { SITE_URL } from "@/lib/supabase/config";
import { DEPARTEMENTS } from "@/lib/zones";

export type StatutDemande = "ouverte" | "transmise" | "signee" | "non_signee" | "expiree" | "annulee";
export type ModeCoordonnees = "renseignees" | "par_auteur";

// Une ligne de la liste des demandes (jamais de coordonnées des mariés)
export type LigneDemande = {
  id: string;
  auteur_id: string;
  auteur_nom: string;
  groupe_id: string;
  date_mariage: string;
  departement: string;
  zone: string;
  lieu: string;
  metier_id: number;
  invites: number | null;
  budget: number | null;
  note: string;
  mode_coordonnees: ModeCoordonnees;
  statut: StatutDemande;
  cree_le: string;
  transmise_le: string | null;
  nb_positionnes: number;
  complete: boolean;
  je_suis_positionne: boolean;
};

export type Positionne = {
  membre_id: string;
  nom: string;
  entreprise: string;
  metier_id: number | null;
  metiers?: number[];
  lien: string;
  email: string;
  message: string;
  cree_le: string;
  retire_le: string | null;
  coordonnees_recues_le: string | null;
};

export type DetailDemande = {
  id: string;
  auteur_id: string;
  groupe_id: string;
  date_mariage: string;
  departement: string;
  zone: string;
  lieu: string;
  metier_id: number;
  invites: number | null;
  budget: number | null;
  note: string;
  mode_coordonnees: ModeCoordonnees;
  statut: StatutDemande;
  signee_par: string | null;
  cree_le: string;
  modifie_le: string;
  transmise_le: string | null;
  coordonnees_supprimees_le: string | null;
  auteur: { id: string; nom: string; entreprise: string; metier_id: number | null; lien: string };
  nb_positionnes: number;
  places_max: number;
  je_suis_auteur: boolean;
  je_suis_positionne: boolean;
  mon_positionnement: {
    id: string;
    message: string;
    cree_le: string;
    retire_le: string | null;
    coordonnees_recues_le: string | null;
  } | null;
  groupe: { id: string; metier_id: number; statut: StatutDemande }[];
  coordonnees?: { nom: string; telephone: string; email: string } | null;
  positionnes?: Positionne[];
};

export type Suivi = {
  id: string;
  role: "auteur" | "positionne";
  date_mariage: string;
  departement: string;
  lieu: string;
  metier_id: number;
  statut: StatutDemande;
  mode_coordonnees: ModeCoordonnees;
  nb_positionnes: number;
  complete: boolean;
  cree_le: string;
  positionne_le: string | null;
  retire_le: string | null;
  coordonnees_recues_le: string | null;
  auteur_nom: string | null;
};

export const PLACES_MAX = 3;
// Délai laissé à l'auteur pour transmettre lui-même les coordonnées
export const DELAI_TRANSMISSION_H = 24;

// Statut affiché : « Complète » quand les 3 places sont prises
export function libelleStatut(statut: StatutDemande, complete = false) {
  if (complete) return "Complète";
  return {
    ouverte: "Ouverte",
    transmise: "Transmise",
    signee: "Signée",
    non_signee: "Non signée",
    expiree: "Expirée",
    annulee: "Annulée",
  }[statut];
}

export function couleurStatut(statut: StatutDemande, complete = false) {
  if (complete) return "bg-encre/10 text-encre";
  return {
    ouverte: "bg-succes/15 text-succes",
    transmise: "bg-or-clair/60 text-or-fonce",
    signee: "bg-or text-blanc",
    non_signee: "bg-creme-fonce text-encre-doux",
    expiree: "bg-creme-fonce text-encre-doux",
    annulee: "bg-alerte/10 text-alerte",
  }[statut];
}

// « 2027-09-12 » → objet Date à minuit (heure locale), sans décalage de fuseau
export function dateLocale(iso: string) {
  const [a, m, j] = iso.slice(0, 10).split("-").map(Number);
  return new Date(a, m - 1, j);
}

const majuscule = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

export function dateLongue(iso: string) {
  return majuscule(dateLocale(iso).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }));
}

export function dateCourte(iso: string) {
  return majuscule(dateLocale(iso).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short", year: "numeric" }));
}

export function aujourdhuiIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Nombre d'invités (facultatif)
export function texteInvites(n: number | null | undefined) {
  return n ? `${n} invités` : "Invités : non précisé";
}

export function euros(n: number) {
  return n.toLocaleString("fr-FR") + " €";
}

export function depart(code: string) {
  return DEPARTEMENTS.find((d) => d.code === code);
}

export function adresseDemande(id: string) {
  const base = typeof window !== "undefined" ? window.location.origin : SITE_URL;
  return `${base}/demande/${id}`;
}

// Message court pour WhatsApp (sans aucune coordonnée des mariés)
export function messageWhatsApp(d: { id: string; date_mariage: string; departement: string; lieu: string; invites: number | null }, metier: string, relance = false) {
  const debut = relance ? "🔁 Toujours personne pour cette demande !" : "💍 Demande de mariés à transmettre";
  return [
    `${debut}`,
    `${metier} · ${dateCourte(d.date_mariage)}`,
    `📍 ${d.lieu} (${d.departement})${d.invites ? ` · ${d.invites} invités` : ""}`,
    `Qui est dispo ? 👉 ${adresseDemande(d.id)}`,
  ].join("\n");
}

export function lienWhatsApp(texte: string) {
  return `https://wa.me/?text=${encodeURIComponent(texte)}`;
}

// Temps restant avant la fin du délai de 24 h (en millisecondes, peut être négatif)
export function resteAvantEcheance(positionneLe: string, maintenant = Date.now()) {
  return new Date(positionneLe).getTime() + DELAI_TRANSMISSION_H * 3600_000 - maintenant;
}

export function dureeLisible(ms: number) {
  const min = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} min`;
  return `${h} h ${String(m).padStart(2, "0")}`;
}
