// Structure d'un plan de salle (reprise du prototype plan-de-salle.html).
// Toutes les mesures sont en centimètres.

export type TypeElement = "round" | "rect" | "zone" | "pillar";

export type Invite = string; // un nom par invité (enrichi à l'étape 2 : menu…)

type Base = {
  id: string;
  type: TypeElement;
  name: string;
  x: number; // centre
  y: number;
  rot: number; // rotation en degrés
  guests: Invite[];
};

export type TableRonde = Base & { type: "round"; d: number; chairs: number };
export type TableRect = Base & { type: "rect"; L: number; W: number; sides: number; ends: number };
export type Zone = Base & { type: "zone"; L: number; W: number };
export type Poteau = Base & { type: "pillar"; L: number; shape: "square" | "round" };

export type Element = TableRonde | TableRect | Zone | Poteau;

export type PlanContenu = {
  name: string;
  room: { w: number; h: number };
  passage: number; // passage minimum entre les tables (cm)
  items: Element[];
};

export type TypeCompte = "maries" | "lieu" | "decoratrice" | "prestataire" | "wedding_planner";

export const TYPES_COMPTE: { valeur: TypeCompte; texte: string; detail: string }[] = [
  { valeur: "maries", texte: "Nous nous marions", detail: "Futurs mariés qui préparent leur plan de table" },
  { valeur: "lieu", texte: "Lieu de réception", detail: "Domaine, château, salle…" },
  { valeur: "decoratrice", texte: "Décoration", detail: "Décoratrice, fleuriste, scénographe" },
  { valeur: "prestataire", texte: "Autre prestataire", detail: "Traiteur, loueur, DJ…" },
  { valeur: "wedding_planner", texte: "Wedding planner", detail: "Avec Ma Coordo pour le jour J" },
];

export type Plan = {
  id: string;
  proprietaire_id: string;
  nom: string;
  contenu: PlanContenu;
  version: number;
  archive: boolean;
  updated_at: string;
  created_at: string;
  role?: "proprietaire" | "editeur" | "lecteur";
};
