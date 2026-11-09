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
