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
  switch (type) {
    case "round": return { ...base, type, name: nomLibre(c, "Table"), d: 180, chairs: 10 };
    case "rect": return { ...base, type, name: nomLibre(c, "Table"), L: 180, W: 80, sides: 3, ends: 0 };
    case "zone": return { ...base, type, name: "Piste de danse", L: 500, W: 500 };
    case "estrade": return { ...base, type, name: "Estrade", L: 400, W: 250 };
    case "pillar": return { ...base, type, name: nomLibre(c, "Poteau"), L: 40, shape: "square" };
    case "porte": return { ...base, type, name: nomLibre(c, "Porte"), L: 90, sens: "droite", y: 0 };
    case "fenetre": return { ...base, type, name: nomLibre(c, "Fenêtre"), L: 150, y: 0 };
  }
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
