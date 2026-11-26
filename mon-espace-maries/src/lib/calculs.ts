// Calculs de l'appli, sans dépendance : statuts, avancement, budget au centime,
// dates à l'heure de Paris. Testés dans calculs.test.mts.

export type Statut = "termine" | "en_cours" | "pas_commence";
export type Langue = "fr" | "en";

const FUSEAU = "Europe/Paris";

// ---------- Rétroplanning ----------
// Statut d'une étape : calculé tout seul quand elle a des sous-étapes
export function statutEtape(statutPropre: Statut, sousStatuts: Statut[]): Statut {
  if (sousStatuts.length === 0) return statutPropre;
  if (sousStatuts.every((s) => s === "termine")) return "termine";
  if (sousStatuts.some((s) => s !== "pas_commence")) return "en_cours";
  return "pas_commence";
}

// Avancement en % : étapes principales terminées / total des étapes principales
export function avancement(statutsPrincipaux: Statut[]): number {
  if (statutsPrincipaux.length === 0) return 0;
  const faites = statutsPrincipaux.filter((s) => s === "termine").length;
  return Math.round((faites / statutsPrincipaux.length) * 100);
}

// ---------- Argent (toujours en centimes pour un calcul exact) ----------
export function centimes(montant: number | string | null | undefined): number | null {
  if (montant === null || montant === undefined || montant === "") return null;
  const n = typeof montant === "number" ? montant : Number(String(montant).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

export type LigneBudget = { estime: number | string | null; reel: number | string | null };

// Écart = réel − estimé (null tant que le réel n'est pas connu)
export function ecart(l: LigneBudget): number | null {
  const r = centimes(l.reel);
  if (r === null) return null;
  return r - (centimes(l.estime) ?? 0);
}

// Budget estimé, et budget réajusté (réel quand il est connu, sinon estimé)
export function totauxBudget(lignes: LigneBudget[]) {
  let estime = 0;
  let reajuste = 0;
  for (const l of lignes) {
    const e = centimes(l.estime) ?? 0;
    const r = centimes(l.reel);
    estime += e;
    reajuste += r ?? e;
  }
  return { estime, reajuste, ecart: reajuste - estime };
}

export type Echeance = { montant: number | string; statut: string; date_prevue: string | null };

export function totauxPaiements(echeances: Echeance[]) {
  let regle = 0;
  let reste = 0;
  for (const e of echeances) {
    const m = centimes(e.montant) ?? 0;
    if (e.statut === "paye") regle += m;
    else reste += m;
  }
  return { regle, reste };
}

// Prochaine échéance : la première qui n'est pas payée
export function prochaineEcheance<T extends Echeance>(echeances: T[]): T | undefined {
  return echeances.find((e) => e.statut !== "paye");
}

// Le solde doit tomber au plus tard 1 mois avant le mariage
export function soldeTropTard(echeances: Echeance[], dateMariage: string): boolean {
  const dates = echeances.map((e) => e.date_prevue).filter((d): d is string => !!d).sort();
  const derniere = dates.at(-1);
  if (!derniere) return false;
  return derniere > ajouterMois(dateMariage, -1);
}

export function formatEuros(cts: number | null, langue: Langue = "fr"): string {
  if (cts === null) return "—";
  const avecCentimes = cts % 100 !== 0;
  return new Intl.NumberFormat(langue === "en" ? "en-GB" : "fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: avecCentimes ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(cts / 100);
}

export function formatEcart(cts: number | null, langue: Langue = "fr"): string {
  if (cts === null || cts === 0) return "—";
  return (cts > 0 ? "+" : "−") + formatEuros(Math.abs(cts), langue);
}

// ---------- Dates (calendrier de Paris) ----------
// « 2026-11-26 » : la date du jour à Paris
export function aujourdhuiParis(maintenant: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: FUSEAU, year: "numeric", month: "2-digit", day: "2-digit" }).format(maintenant);
}

function versJour(iso: string) {
  const [a, m, j] = iso.slice(0, 10).split("-").map(Number);
  return Date.UTC(a, m - 1, j);
}

export function ajouterJours(iso: string, jours: number): string {
  return new Date(versJour(iso) + jours * 86400000).toISOString().slice(0, 10);
}

export function ajouterMois(iso: string, mois: number): string {
  const [a, m, j] = iso.slice(0, 10).split("-").map(Number);
  const cible = new Date(Date.UTC(a, m - 1 + mois, 1));
  const dernierJour = new Date(Date.UTC(cible.getUTCFullYear(), cible.getUTCMonth() + 1, 0)).getUTCDate();
  cible.setUTCDate(Math.min(j, dernierJour));
  return cible.toISOString().slice(0, 10);
}

// Décompte « J-X » jusqu'au mariage (0 le jour J, négatif après)
export function joursAvant(dateMariage: string, maintenant: Date = new Date()): number {
  return Math.round((versJour(dateMariage) - versJour(aujourdhuiParis(maintenant))) / 86400000);
}

// Instant correspondant à une date et une heure de Paris (gère l'heure d'été)
export function instantParis(iso: string, heure: string): Date {
  const [h, mi] = heure.split(":").map(Number);
  const approx = new Date(versJour(iso) + (h * 60 + mi) * 60000);
  const enParis = new Date(approx.toLocaleString("en-US", { timeZone: FUSEAU }));
  const enUtc = new Date(approx.toLocaleString("en-US", { timeZone: "UTC" }));
  return new Date(approx.getTime() - (enParis.getTime() - enUtc.getTime()));
}

// L'album s'ouvre le lendemain du mariage à 10 h
export function ouvertureAlbum(dateMariage: string): Date {
  return instantParis(ajouterJours(dateMariage, 1), "10:00");
}

export function albumOuvert(dateMariage: string, maintenant: Date = new Date()): boolean {
  return maintenant.getTime() >= ouvertureAlbum(dateMariage).getTime();
}

// Le déroulé définitif est visible à partir d'un mois avant le mariage
export function derouleDefinitif(dateMariage: string, maintenant: Date = new Date()): boolean {
  return aujourdhuiParis(maintenant) >= ajouterMois(dateMariage, -1);
}

// Données supprimées 6 mois après le mariage
export function dateSuppression(dateMariage: string): string {
  return ajouterMois(dateMariage, 6);
}

export function formatDate(iso: string | null | undefined, langue: Langue = "fr", options: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" }): string {
  if (!iso) return "";
  const d = iso.length <= 10 ? new Date(versJour(iso) + 12 * 3600000) : new Date(iso);
  return new Intl.DateTimeFormat(langue === "en" ? "en-GB" : "fr-FR", { timeZone: FUSEAU, ...options }).format(d);
}

export function formatDateHeure(iso: string | null | undefined, langue: Langue = "fr"): string {
  if (!iso) return "";
  const d = new Date(iso);
  const jour = new Intl.DateTimeFormat(langue === "en" ? "en-GB" : "fr-FR", { timeZone: FUSEAU, weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(d);
  return `${langue === "fr" ? jour.charAt(0).toUpperCase() + jour.slice(1) : jour}, ${formatHeure(iso, langue)}`;
}

// « 14 h 30 » en français, « 2:30 pm » en anglais
export function formatHeure(iso: string, langue: Langue = "fr"): string {
  const parties = new Intl.DateTimeFormat("fr-FR", { timeZone: FUSEAU, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso)).split(":");
  const h = Number(parties[0]);
  const m = parties[1];
  if (langue === "en") return `${((h + 11) % 12) + 1}:${m} ${h < 12 ? "am" : "pm"}`;
  return m === "00" ? `${h} h` : `${h} h ${m}`;
}

// Saisie « date + heure » (heure de Paris) → instant ISO pour la base
export function versInstant(date: string, heure: string): string | null {
  if (!date) return null;
  return instantParis(date, heure || "12:00").toISOString();
}

// Instant ISO → { date, heure } à l'heure de Paris, pour pré-remplir un formulaire
export function depuisInstant(iso: string | null): { date: string; heure: string } {
  if (!iso) return { date: "", heure: "" };
  const d = new Date(iso);
  const heure = new Intl.DateTimeFormat("fr-FR", { timeZone: FUSEAU, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(d);
  return { date: aujourdhuiParis(d), heure };
}
