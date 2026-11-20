// Création et modification des éléments du plan
import { uid } from "./exemple";
import { estTable } from "./moteur";
import type { Element, Invite, PlanContenu, TypeElement } from "./types";

function nomLibre(c: PlanContenu, base: string) {
  const noms = new Set(c.items.map((i) => i.name));
  let n = 1;
  while (noms.has(`${base} ${n}`)) n++;
  return `${base} ${n}`;
}

export function nouvelElement(c: PlanContenu, type: TypeElement, x: number, y: number): Element {
  const base = { id: uid(), x: Math.round(x / 5) * 5, y: Math.round(y / 5) * 5, rot: 0, guests: [] as Invite[] };
  // Une nouvelle table reprend la taille de la dernière table du même type (ex. 183 × 76 cm)
  const derniere = [...c.items].reverse().find((e) => e.type === type);
  switch (type) {
    case "round": {
      const d = derniere?.type === "round" ? { d: derniere.d, chairs: derniere.chairs } : { d: 180, chairs: 10 };
      return { ...base, type, name: nomLibre(c, "Table"), ...d };
    }
    case "rect": {
      const d = derniere?.type === "rect" ? { L: derniere.L, W: derniere.W, sides: derniere.sides, ends: derniere.ends } : { L: 180, W: 80, sides: 3, ends: 0 };
      return { ...base, type, name: nomLibre(c, "Table"), ...d };
    }
    case "zone": return { ...base, type, name: "Piste de danse", L: 500, W: 500 };
    case "estrade": return { ...base, type, name: "Estrade", L: 400, W: 250 };
    case "pillar": return { ...base, type, name: nomLibre(c, "Poteau"), L: 40, shape: "square" };
    case "porte": return { ...base, type, name: nomLibre(c, "Porte"), L: 90, sens: "droite", y: 0 };
    case "fenetre": return { ...base, type, name: nomLibre(c, "Fenêtre"), L: 150, y: 0 };
  }
}

// Tailles de tables utilisées dans le plan (pour les proposer en raccourci)
export function taillesUtilisees(c: PlanContenu, type: "round" | "rect"): string[] {
  const t = new Set<string>();
  for (const e of c.items) {
    if (e.type === "round" && type === "round") t.add(String(e.d));
    if (e.type === "rect" && type === "rect") t.add(`${e.L}×${e.W}`);
  }
  return [...t];
}

// Donne à toutes les tables du même type la taille et les chaises de celle-ci
// (sauf les tables fixées par le lieu)
export function appliquerATouteslesTables(c: PlanContenu, id: string): PlanContenu {
  const m = c.items.find((e) => e.id === id);
  if (!m || (m.type !== "round" && m.type !== "rect")) return c;
  return {
    ...c,
    items: c.items.map((e) => {
      if (e.id === id || e.type !== m.type || e.verrou) return e;
      if (m.type === "round") return { ...e, d: m.d, chairs: m.chairs } as Element;
      return { ...e, L: m.L, W: m.W, sides: m.sides, ends: m.ends } as Element;
    }),
  };
}

export const majElement = (c: PlanContenu, id: string, champs: Partial<Element>): PlanContenu => ({
  ...c,
  items: c.items.map((e) => (e.id === id ? ({ ...e, ...champs } as Element) : e)),
});

export function dupliquer(c: PlanContenu, id: string, nouvelId = uid()): { contenu: PlanContenu; nouvelId: string } {
  const e = c.items.find((i) => i.id === id)!;
  const copie = { ...structuredClone(e), id: nouvelId, x: e.x + 60, y: e.y + 60, guests: [], verrou: false } as Element;
  if (estTable(copie)) copie.name = nomLibre(c, "Table");
  return { contenu: { ...c, items: [...c.items, copie] }, nouvelId: copie.id };
}

// Supprimer un élément : ses invités repartent dans la liste des non placés
export function supprimer(c: PlanContenu, id: string): PlanContenu {
  const e = c.items.find((i) => i.id === id);
  return { ...c, items: c.items.filter((i) => i.id !== id), nonPlaces: [...(c.nonPlaces ?? []), ...(e?.guests ?? [])] };
}

// Déplace un invité vers une table (ou vers les non placés si tableId = null)
export function placerInvite(c: PlanContenu, inviteId: string, tableId: string | null): PlanContenu {
  let invite: Invite | undefined;
  const items = c.items.map((e) => {
    const g = e.guests.find((x) => x.id === inviteId);
    if (!g) return e;
    invite = g;
    return { ...e, guests: e.guests.filter((x) => x.id !== inviteId) } as Element;
  });
  let nonPlaces = c.nonPlaces ?? [];
  if (!invite) {
    invite = nonPlaces.find((x) => x.id === inviteId);
    nonPlaces = nonPlaces.filter((x) => x.id !== inviteId);
  }
  if (!invite) return c;
  if (tableId === null) return { ...c, items, nonPlaces: [...nonPlaces, invite] };
  return { ...c, nonPlaces, items: items.map((e) => (e.id === tableId ? ({ ...e, guests: [...e.guests, invite!] } as Element) : e)) };
}

export function majInvite(c: PlanContenu, inviteId: string, champs: Partial<Invite>): PlanContenu {
  const maj = (l: Invite[]) => l.map((g) => (g.id === inviteId ? { ...g, ...champs } : g));
  return { ...c, nonPlaces: maj(c.nonPlaces ?? []), items: c.items.map((e) => ({ ...e, guests: maj(e.guests) }) as Element) };
}

export function supprimerInvite(c: PlanContenu, inviteId: string): PlanContenu {
  const f = (l: Invite[]) => l.filter((g) => g.id !== inviteId);
  return { ...c, nonPlaces: f(c.nonPlaces ?? []), items: c.items.map((e) => ({ ...e, guests: f(e.guests) }) as Element) };
}

export const ZONES_PRETES: [string, number, number][] = [
  ["Piste de danse", 500, 500],
  ["Buffet", 400, 150],
  ["Bar", 300, 100],
  ["DJ / musiciens", 250, 150],
  ["Photobooth", 250, 250],
  ["Espace enfants", 400, 300],
  ["Cocktail", 600, 400],
];
