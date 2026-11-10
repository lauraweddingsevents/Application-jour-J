// Les « fiches » manipulées par l'application (miroir de la base de données)

export type Mariage = {
  id: string;
  nom_marie_1: string;
  nom_marie_2: string;
  date_mariage: string; // AAAA-MM-JJ
  lieu_principal: string | null;
  fuseau_horaire: string;
  delai_alerte_defaut: number;
  canal: string;
};

export type Categorie = "prestataire" | "proche";

export type Intervenant = {
  id: string;
  mariage_id: string;
  nom: string;
  role: string | null;
  categorie: Categorie;
  telephone: string | null;
  email: string | null;
  jeton: string;
  acces_coordination: boolean;
  ordre: number;
};

export function nomMariage(m: Pick<Mariage, "nom_marie_1" | "nom_marie_2">) {
  return `${m.nom_marie_1} & ${m.nom_marie_2}`;
}

export type Moment = {
  id: string;
  mariage_id: string;
  titre: string;
  debut: string; // instant ISO
  fin: string | null;
  lieu: string | null;
  notes: string | null;
  ordre: number;
  raccourci: boolean; // temps fort affiché en raccourci
  intervenants: string[]; // identifiants des intervenants assignés
};

// Temps forts proposés en raccourci par défaut
export function estTempsFort(titre: string) {
  return /^(cérémonie|vin d.honneur|cocktail|dîner|repas|soirée dansante|ouverture de bal)/i.test(titre.trim());
}

export type Annonce = { id: string; texte: string; auteur: string | null; le: string };

// Trie les moments dans l'ordre de la journée
export function trierMoments<T extends Pick<Moment, "debut" | "ordre">>(liste: T[]) {
  return [...liste].sort((a, b) => a.debut.localeCompare(b.debut) || a.ordre - b.ordre);
}

export type CategorieFiche = "contact" | "adresse" | "meteo" | "note";
export type Visibilite = "tous" | "prestataires";

export type ElementFiche = {
  id: string;
  mariage_id: string;
  categorie: CategorieFiche;
  titre: string;
  contenu: string | null;
  telephone: string | null;
  adresse: string | null;
  visibilite: Visibilite;
  ordre: number;
};

export function lienGoogleMaps(adresse: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(adresse)}`;
}

export function lienTelephone(tel: string) {
  return `tel:${tel.replace(/[^\d+]/g, "")}`;
}
