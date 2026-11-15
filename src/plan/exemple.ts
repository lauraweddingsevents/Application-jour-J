import type { PlanContenu, TableRonde } from "./types";

export const uid = () => Math.random().toString(36).slice(2, 9);

// Plan de départ (le même que dans le prototype) : table d'honneur, piste, 4 tables rondes
export function planExemple(nom: string): PlanContenu {
  const t = (n: number, x: number, y: number): TableRonde => ({
    id: uid(), type: "round", name: `Table ${n}`, x, y, rot: 0, d: 180, chairs: 10, guests: [],
  });
  return {
    name: nom,
    room: { w: 2000, h: 1400 },
    passage: 90,
    items: [
      { id: uid(), type: "rect", name: "Table d'honneur", x: 1000, y: 200, rot: 0, L: 360, W: 80, sides: 4, ends: 0, guests: [] },
      { id: uid(), type: "zone", name: "Piste de danse", x: 1000, y: 800, rot: 0, L: 500, W: 500, guests: [] },
      t(1, 330, 600), t(2, 330, 1050), t(3, 1670, 600), t(4, 1670, 1050),
    ],
  };
}

export function planVide(nom: string, largeurM = 20, longueurM = 14): PlanContenu {
  return { name: nom, room: { w: Math.round(largeurM * 100), h: Math.round(longueurM * 100) }, passage: 90, items: [] };
}
