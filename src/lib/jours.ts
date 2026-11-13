// Les jours d'un mariage : le jour J (date du mariage) + les jours ajoutés
import type { Journee } from "@/lib/types";

export const JOUR_J = "jour-j"; // identifiant du jour J dans l'interface

export type Jour = { cle: string; id: string | null; date: string; titre: string; principal: boolean };

export function listeDesJours(dateMariage: string, journees: Pick<Journee, "id" | "date_jour" | "titre">[]): Jour[] {
  return [
    { cle: JOUR_J, id: null, date: dateMariage, titre: "Jour J", principal: true },
    ...journees.map((j) => ({ cle: j.id, id: j.id, date: j.date_jour, titre: j.titre || "", principal: false })),
  ].sort((a, b) => a.date.localeCompare(b.date));
}

// Clé du jour d'un moment
export function cleDuJour(journeeId: string | null | undefined) {
  return journeeId ?? JOUR_J;
}

function versDate(dateIso: string) {
  const [a, m, j] = dateIso.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, j, 12));
}

// « Ven. 4 »
export function jourCourt(dateIso: string) {
  const t = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", timeZone: "UTC" }).format(versDate(dateIso));
  return t.charAt(0).toUpperCase() + t.slice(1);
}

// « vendredi 4 décembre »
export function jourLong(dateIso: string) {
  return new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(versDate(dateIso));
}

// « 4 – 6 décembre 2026 » (ou une seule date)
export function plageDeDates(jours: Jour[]) {
  const f = (d: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("fr-FR", { ...o, timeZone: "UTC" }).format(versDate(d));
  const debut = jours[0].date;
  const fin = jours[jours.length - 1].date;
  if (debut === fin) return null;
  const memeMois = debut.slice(0, 7) === fin.slice(0, 7);
  return memeMois
    ? `${f(debut, { day: "numeric" })} – ${f(fin, { day: "numeric", month: "long", year: "numeric" })}`
    : `${f(debut, { day: "numeric", month: "long" })} – ${f(fin, { day: "numeric", month: "long", year: "numeric" })}`;
}

// Date du jour (AAAA-MM-JJ) dans le fuseau du mariage
export function aujourdhuiDans(fuseau: string, maintenant = Date.now()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: fuseau, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(maintenant),
  );
}

// Jour à afficher en premier : celui d'aujourd'hui (avant 6 h : la veille,
// pour les soirées qui se prolongent), sinon le jour J
export function jourParDefaut(jours: Jour[], fuseau: string, maintenant = Date.now()) {
  const auj = aujourdhuiDans(fuseau, maintenant - 6 * 3_600_000);
  return (jours.find((j) => j.date === auj) ?? jours.find((j) => j.principal) ?? jours[0]).cle;
}

// « Aujourd'hui », « Demain », ou « Ven. 4 » pour situer un moment
export function quandEstCeJour(dateJour: string, fuseau: string, maintenant = Date.now()) {
  const auj = aujourdhuiDans(fuseau, maintenant - 6 * 3_600_000);
  if (dateJour === auj) return null;
  const demain = new Date(versDate(auj).getTime() + 86_400_000).toISOString().slice(0, 10);
  return dateJour === demain ? "Demain" : jourCourt(dateJour);
}
