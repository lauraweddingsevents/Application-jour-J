// « il y a 5 min », « il y a 3 h », « hier », « il y a 4 jours »
export function ilYa(instant: string, maintenant = Date.now()) {
  const min = Math.round((maintenant - new Date(instant).getTime()) / 60_000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const j = Math.round(h / 24);
  return j === 1 ? "hier" : `il y a ${j} jours`;
}
