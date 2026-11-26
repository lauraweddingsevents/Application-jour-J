// Lecture du déroulé publié par Ma Coordo (fonction vue_intervenant d'un lien personnel /j/<jeton>)
export type MomentDeroule = { id: string; titre: string; debut: string; fin: string | null; lieu: string | null; journee: string };
export type ReponseDeroule = { disponible: boolean; moments: MomentDeroule[]; jours: { date: string; titre: string | null }[] };

type VueMaCoordo = {
  mariage?: { date_mariage?: string };
  journees?: { id: string; date_jour: string; titre: string | null }[];
  moments?: { id: string; titre: string; debut: string; fin: string | null; lieu: string | null; journee_id: string | null; ordre?: number }[];
} | null;

// « https://ma-coordo.vercel.app/j/AbC123xyz » → « AbC123xyz »
export function jetonMaCoordo(lien: string): string | null {
  const m = lien.trim().match(/\/j\/([A-Za-z0-9_-]{6,64})(?:[/?#]|$)/);
  return m ? m[1] : null;
}

// Garde uniquement les horaires, moments et lieux (pas les intervenants ni les notes internes)
export function convertirDeroule(vue: VueMaCoordo): ReponseDeroule {
  if (!vue?.mariage?.date_mariage) return { disponible: false, moments: [], jours: [] };
  const jourJ = vue.mariage.date_mariage;
  const journees = vue.journees ?? [];
  const dateDe = (id: string | null) => (id ? journees.find((j) => j.id === id)?.date_jour ?? jourJ : jourJ);
  const moments: MomentDeroule[] = (vue.moments ?? [])
    .map((m) => ({ id: m.id, titre: m.titre, debut: m.debut, fin: m.fin, lieu: m.lieu, journee: dateDe(m.journee_id) }))
    .sort((a, b) => a.journee.localeCompare(b.journee) || a.debut.localeCompare(b.debut));
  return {
    disponible: true,
    moments,
    jours: [{ date: jourJ, titre: null }, ...journees.map((j) => ({ date: j.date_jour, titre: j.titre }))],
  };
}
