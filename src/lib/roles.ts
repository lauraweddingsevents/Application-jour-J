import type { Categorie } from "@/lib/types";

// Rôles proposés à la saisie (on peut aussi en taper un autre)
export const ROLES_PRESTATAIRES = [
  "Wedding planner",
  "Lieu de réception",
  "Traiteur",
  "Photographe",
  "Vidéaste",
  "DJ",
  "Musiciens",
  "Officiant de cérémonie laïque",
  "Fleuriste",
  "Décoratrice",
  "Coiffure",
  "Maquillage",
  "Pâtissier",
  "Barman",
  "Transport",
  "Animation enfants",
  "Photobooth",
];

export const ROLES_PROCHES = [
  "Témoin",
  "Demoiselle d'honneur",
  "Garçon d'honneur",
  "Famille",
  "Mère de la mariée",
  "Père de la mariée",
  "Mère du marié",
  "Père du marié",
  "Ami·e",
  "Enfant d'honneur",
];

// Devine la catégorie à partir du rôle tapé
export function categoriePourRole(role: string): Categorie | null {
  const r = role.trim().toLowerCase();
  if (!r) return null;
  if (ROLES_PROCHES.some((p) => p.toLowerCase() === r)) return "proche";
  if (/t[ée]moin|famille|m[èe]re|p[èe]re|honneur|ami|soeur|sœur|fr[èe]re|cousin|oncle|tante/.test(r))
    return "proche";
  if (ROLES_PRESTATAIRES.some((p) => p.toLowerCase() === r)) return "prestataire";
  return null;
}
