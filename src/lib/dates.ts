// Mise en forme des dates en français

// « samedi 12 juin 2027 » à partir de « 2027-06-12 »
export function dateLongue(dateIso: string) {
  const [a, m, j] = dateIso.split("-").map(Number);
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(a, m - 1, j, 12)));
}

// Nombre de jours entre aujourd'hui et la date (négatif si passée)
export function joursAvant(dateIso: string) {
  const [a, m, j] = dateIso.split("-").map(Number);
  const cible = Date.UTC(a, m - 1, j);
  const now = new Date();
  const aujourdhui = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((cible - aujourdhui) / 86_400_000);
}

export function libelleCompteARebours(dateIso: string) {
  const n = joursAvant(dateIso);
  if (n === 0) return "C'est aujourd'hui\u00a0!";
  if (n === 1) return "Demain";
  if (n > 1) return `Dans ${n} jours`;
  return "Passé";
}
