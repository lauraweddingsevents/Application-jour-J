// Les deux communautés, leurs zones et leurs départements.
// (Même liste que la table « departements » de la base.)

export type Zone = "paca" | "rhone_alpes";

export const ZONES: { code: Zone; nom: string; communaute: string }[] = [
  { code: "paca", nom: "PACA", communaute: "Wedding Presta Club" },
  { code: "rhone_alpes", nom: "Rhône-Alpes", communaute: "Wedding Social Hub" },
];

export const DEPARTEMENTS: { code: string; nom: string; zone: Zone }[] = [
  { code: "04", nom: "Alpes-de-Haute-Provence", zone: "paca" },
  { code: "05", nom: "Hautes-Alpes", zone: "paca" },
  { code: "06", nom: "Alpes-Maritimes", zone: "paca" },
  { code: "13", nom: "Bouches-du-Rhône", zone: "paca" },
  { code: "83", nom: "Var", zone: "paca" },
  { code: "84", nom: "Vaucluse", zone: "paca" },
  { code: "01", nom: "Ain", zone: "rhone_alpes" },
  { code: "07", nom: "Ardèche", zone: "rhone_alpes" },
  { code: "26", nom: "Drôme", zone: "rhone_alpes" },
  { code: "38", nom: "Isère", zone: "rhone_alpes" },
  { code: "42", nom: "Loire", zone: "rhone_alpes" },
  { code: "69", nom: "Rhône", zone: "rhone_alpes" },
  { code: "73", nom: "Savoie", zone: "rhone_alpes" },
  { code: "74", nom: "Haute-Savoie", zone: "rhone_alpes" },
];

export function nomZone(code: string) {
  return ZONES.find((z) => z.code === code)?.nom ?? code;
}

export function zoneDuDepartement(code: string): Zone | undefined {
  return DEPARTEMENTS.find((d) => d.code === code)?.zone;
}

// « 13 · Bouches-du-Rhône »
export function libelleDepartement(code: string) {
  const d = DEPARTEMENTS.find((x) => x.code === code);
  return d ? `${d.code} · ${d.nom}` : code;
}

export function departementsDesZones(zones: string[]) {
  return DEPARTEMENTS.filter((d) => zones.includes(d.zone));
}
