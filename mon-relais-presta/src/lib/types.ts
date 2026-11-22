import type { Zone } from "./zones";

export type StatutMembre = "en_attente" | "valide" | "refuse" | "suspendu";
export type Role = "membre" | "admin";

export type Metier = { id: number; nom: string; ordre: number; actif: boolean };

// Fiche d'un membre telle qu'elle est lisible par les autres membres (jamais l'e-mail)
export type Membre = {
  id: string;
  nom: string;
  entreprise: string;
  metier_id: number | null;
  zones: Zone[];
  departements: string[];
  lien: string;
  role: Role;
  statut: StatutMembre;
  notif_email: boolean;
  notif_push: boolean;
  cree_le: string;
  charte_version: number;
};

export const COLONNES_MEMBRE =
  "id, nom, entreprise, metier_id, zones, departements, lien, role, statut, notif_email, notif_push, cree_le, charte_version";

// Vue de l'administration (avec e-mail)
export type MembreAdmin = Omit<Membre, "notif_email" | "notif_push" | "charte_version"> & {
  email: string;
  admin_zones: Zone[];
  motif_statut: string;
  statut_modifie_le: string | null;
};

export type Charte = { texte: string; version: number; modifie_le: string };
