import type { Langue, Statut } from "./calculs";

export type Formule = "complete" | "coordination_1" | "coordination_2" | "coordination_3";

export type Couple = {
  id: string;
  prenom_1: string;
  prenom_2: string;
  date_mariage: string;
  lieu: string;
  formule: Formule;
  langue: Langue;
  jeton_invites: string;
  questionnaire_termine_le: string | null;
  invitation_envoyee_le?: string | null;
  cree_le: string;
};

export type Personne = {
  id: string;
  role: "admin" | "marie";
  couple_id: string | null;
  prenom: string;
  email: string;
  telephone: string;
  user_id: string | null;
  derniere_connexion: string | null;
};

export type Etape = {
  id: string;
  couple_id: string;
  parent_id: string | null;
  nom: string;
  statut: Statut;
  ordre: number;
};

export type PosteBudget = { id: string; couple_id: string; nom: string; estime: number | null; reel: number | null; ordre: number };

export type StatutEcheance = "a_venir" | "a_confirmer" | "paye";
export type Echeance = {
  id: string;
  couple_id: string;
  libelle: string;
  montant: number;
  date_prevue: string | null;
  statut: StatutEcheance;
  declare_le: string | null;
  paye_le: string | null;
  ordre: number;
};

export type RendezVous = {
  id: string;
  couple_id: string;
  titre: string;
  debut: string | null;
  date_a_fixer: string;
  lieu: string;
  visio: boolean;
  ajoute_par: "laura" | "couple";
};

export type Tache = { id: string; couple_id: string; intitule: string; date_butoir: string | null; fait_le: string | null; cree_le: string };

export type StatutPrestataire = "a_signer" | "signe" | "acompte";
export type Prestataire = {
  id: string;
  couple_id: string;
  categorie: string;
  nom: string;
  contact: string;
  telephone: string;
  email: string;
  statut: StatutPrestataire;
};

export type Proche = { id: string; couple_id: string; nom: string; role: string; telephone: string };

export type StatutDocument = "partage" | "signe" | "a_valider" | "en_relecture" | "relu";
export type DocumentCouple = {
  id: string;
  couple_id: string;
  nom: string;
  chemin: string;
  type_mime: string;
  taille: number;
  depose_par: "laura" | "couple";
  statut: StatutDocument;
  commentaire: string;
  cree_le: string;
};

export type Question = {
  id: string;
  couple_id: string;
  theme: string;
  texte: string;
  type: "libre" | "choix";
  choix: string[];
  sous_question: string;
  sous_question_si: string;
  verdict: string;
  ordre: number;
};

export type Reponse = {
  question_id: string;
  personne_id: string;
  couple_id: string;
  texte: string;
  choix: string[];
  sous_reponse: string;
  maj_le: string;
};

export type Media = { id: string; couple_id: string; chemin: string; type_mime: string; taille: number; invite_prenom: string; cree_le: string };

export type Notification = {
  id: number;
  couple_id: string | null;
  pour_admin: boolean;
  type: string;
  donnees: Record<string, unknown>;
  lien: string;
  lu_le: string | null;
  cree_le: string;
};

export type Reglages = { lien_avis_google: string; lien_avis_mariagesnet: string };

// Ce que la personne qui regarde peut faire sur un espace
export type Droits = {
  admin: boolean;     // Laura
  editer: boolean;    // rétroplanning, budget, prestataires, dépôt de documents
};

export const estCoordination = (f: Formule) => f !== "complete";
