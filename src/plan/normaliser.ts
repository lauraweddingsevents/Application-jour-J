// Met un plan au format actuel : anciens plans (prototype) où les invités
// étaient de simples noms, champs manquants…
import { uid } from "./exemple";
import type { Element, Invite, PlanContenu } from "./types";

function invite(g: unknown): Invite {
  if (typeof g === "string") return { id: uid(), nom: g };
  const i = g as Invite;
  return { id: i.id || uid(), nom: String(i.nom ?? ""), ...(i.menu ? { menu: i.menu } : {}), ...(i.note ? { note: i.note } : {}) };
}

export function normaliser(brut: PlanContenu): PlanContenu {
  const items = (brut.items ?? []).map((e) => {
    const el = { ...e, rot: e.rot ?? 0, guests: (e.guests ?? []).map(invite) } as Element;
    if (el.type === "pillar" && !el.shape) (el as { shape: string }).shape = "square";
    return el;
  });
  return {
    v: 2,
    name: brut.name ?? "Mon plan",
    room: { w: brut.room?.w ?? 2000, h: brut.room?.h ?? 1400, ...(brut.room?.points ? { points: brut.room.points } : {}) },
    passage: brut.passage ?? 90,
    items,
    nonPlaces: (brut.nonPlaces ?? []).map(invite),
  };
}
