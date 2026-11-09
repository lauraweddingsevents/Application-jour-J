// Conversion entre « heure tapée » (ex. 14:30 le jour du mariage) et
// instant précis enregistré dans la base, en tenant compte du fuseau
// horaire (heure d'été / d'hiver) et des horaires après minuit.

// Une heure tapée avant cette limite est rattachée à la nuit suivante
export const HEURE_BASCULE_NUIT = 6;

// Écart (en minutes) entre l'heure locale du fuseau et l'heure universelle
function decalageFuseau(instantMs: number, fuseau: string) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: fuseau,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(new Date(instantMs))
      .map((x) => [x.type, x.value]),
  );
  const local = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return Math.round((local - instantMs) / 60_000);
}

// Heure locale (dans le fuseau) -> instant ISO, en tenant compte de l'heure d'été
function depuisHeureLocale(a: number, mo: number, j: number, h: number, mi: number, fuseau: string) {
  const naif = Date.UTC(a, mo - 1, j, h, mi);
  let res = naif - decalageFuseau(naif, fuseau) * 60_000;
  const corrige = naif - decalageFuseau(res, fuseau) * 60_000;
  if (corrige !== res) res = corrige;
  return new Date(res).toISOString();
}

// « 2027-06-12 » + « 01:30 » -> instant ISO (le 13 juin à 1 h 30, heure de Paris)
export function versInstant(dateMariage: string, heure: string, fuseau: string) {
  const [a, mo, j] = dateMariage.split("-").map(Number);
  const [h, mi] = heure.split(":").map(Number);
  return depuisHeureLocale(a, mo, h < HEURE_BASCULE_NUIT ? j + 1 : j, h, mi, fuseau);
}

// Déplace un instant de N jours en gardant la même heure locale
// (ex. 15 h 45 en novembre -> 15 h 45 en juin, malgré l'heure d'été)
export function decalerDeJours(instant: string, jours: number, fuseau: string) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: fuseau,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
      .formatToParts(new Date(instant))
      .map((x) => [x.type, x.value]),
  );
  return depuisHeureLocale(+p.year, +p.month, +p.day + jours, +p.hour, +p.minute, fuseau);
}

// Instant ISO -> « 14:30 » (pour les champs de saisie)
export function heureSaisie(instant: string, fuseau: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: fuseau,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(instant));
}

// Instant ISO -> « 14h30 » (pour l'affichage)
export function heureAffichee(instant: string, fuseau: string) {
  return heureSaisie(instant, fuseau).replace(":", "h");
}

// Minutes entre deux instants
export function minutesEntre(debut: string, fin: string) {
  return Math.round((new Date(fin).getTime() - new Date(debut).getTime()) / 60_000);
}

export function ajouterMinutes(instant: string, minutes: number) {
  return new Date(new Date(instant).getTime() + minutes * 60_000).toISOString();
}

// 90 -> « 1 h 30 », 45 -> « 45 min »
export function dureeLisible(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${String(m).padStart(2, "0")}` : `${h} h`;
}

// Vrai si l'instant tombe après minuit (le lendemain de la date du mariage)
export function estApresMinuit(instant: string, dateMariage: string, fuseau: string) {
  const jourLocal = new Intl.DateTimeFormat("en-CA", {
    timeZone: fuseau,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(instant));
  return jourLocal > dateMariage;
}
