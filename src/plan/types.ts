// Structure d'un plan de salle (reprise et enrichie du prototype plan-de-salle.html).
// Toutes les mesures sont en centimètres ; x, y = centre de l'élément.

export type Menu =
  | "standard"
  | "enfant"
  | "vegetarien"
  | "vegan"
  | "pescetarien"
  | "sans_porc"
  | "halal"
  | "casher"
  | "autre";

export const MENUS: { valeur: Menu; texte: string; court: string }[] = [
  { valeur: "standard", texte: "Menu standard", court: "" },
  { valeur: "enfant", texte: "Menu enfant", court: "enfant" },
  { valeur: "vegetarien", texte: "Végétarien", court: "végé" },
  { valeur: "vegan", texte: "Végan", court: "végan" },
  { valeur: "pescetarien", texte: "Pescétarien", court: "pesco" },
  { valeur: "sans_porc", texte: "Sans porc", court: "sans porc" },
  { valeur: "halal", texte: "Halal", court: "halal" },
  { valeur: "casher", texte: "Casher", court: "casher" },
  { valeur: "autre", texte: "Autre (préciser)", court: "autre" },
];

export type Invite = {
  id: string;
  nom: string;
  menu?: Menu; // absent = menu standard
  note?: string; // précision de menu (jamais d'information médicale)
};

export type TypeElement = "round" | "rect" | "zone" | "estrade" | "pillar" | "porte" | "fenetre";

type Base = {
  id: string;
  type: TypeElement;
  name: string;
  x: number;
  y: number;
  rot: number; // rotation en degrés
  guests: Invite[];
  verrou?: boolean; // fixé par le lieu (salle modèle) : non modifiable par le couple
  note?: string; // note libre (utile aux décoratrices)
};

export type TableRonde = Base & { type: "round"; d: number; chairs: number };
export type TableRect = Base & { type: "rect"; L: number; W: number; sides: number; ends: number };
export type Zone = Base & { type: "zone"; L: number; W: number };
export type Estrade = Base & { type: "estrade"; L: number; W: number };
export type Poteau = Base & { type: "pillar"; L: number; shape: "square" | "round" };
export type Porte = Base & { type: "porte"; L: number; sens: "gauche" | "droite" };
export type Fenetre = Base & { type: "fenetre"; L: number };

export type Element = TableRonde | TableRect | Zone | Estrade | Poteau | Porte | Fenetre;
export type Table = TableRonde | TableRect;

export type Point = [number, number];

export type Salle = {
  w: number; // largeur hors tout
  h: number; // longueur hors tout
  points?: Point[]; // contour si la salle n'est pas rectangulaire (salle en L)
};

export type PlanContenu = {
  v?: 2; // version du format
  name: string;
  room: Salle;
  passage: number; // passage minimum entre les tables, chaises comprises (cm)
  items: Element[];
  nonPlaces?: Invite[]; // invités pas encore placés à une table
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
  est_modele?: boolean; // salle modèle d'un lieu de réception
  modele_id?: string | null; // plan créé à partir d'une salle modèle
  structure_verrouillee?: boolean; // forme de la salle et éléments fixes non modifiables
  mariage_id?: string | null; // relié à un mariage de Ma Coordo
  updated_at: string;
  created_at: string;
  role?: "proprietaire" | "editeur" | "lecteur";
};
