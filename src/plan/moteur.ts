// Calculs du plan de salle, repris à l'identique du prototype :
// places par table, contours (chaises comprises), chevauchements,
// passages trop étroits, éléments qui dépassent, récapitulatif.
import type { Element, PlanContenu } from "./types";

export const PROFONDEUR_CHAISE = 55; // profondeur chaise + dégagement (cm)

export const estTable = (e: Element) => e.type === "round" || e.type === "rect";

export function places(e: Element) {
  if (e.type === "round") return e.chairs;
  if (e.type === "rect") return 2 * e.sides + 2 * e.ends;
  return 0;
}

type Point = [number, number];

// Contour d'un élément (chaises comprises), en coordonnées de la salle
export function contour(e: Element): Point[] {
  let pts: Point[] = [];
  if (e.type === "round" || (e.type === "pillar" && e.shape === "round")) {
    const n = 20;
    const rayon = e.type === "pillar" ? e.L / 2 : e.d / 2 + (e.chairs ? PROFONDEUR_CHAISE : 0);
    const r = rayon / Math.cos(Math.PI / n);
    for (let i = 0; i < n; i++) {
      const a = (2 * Math.PI * i) / n;
      pts.push([r * Math.cos(a), r * Math.sin(a)]);
    }
  } else {
    const L = e.type === "pillar" ? e.L : e.L;
    const W = e.type === "pillar" ? e.L : e.W;
    const hx = L / 2 + (e.type === "rect" && e.ends ? PROFONDEUR_CHAISE : 0);
    const hy = W / 2 + (e.type === "rect" && e.sides ? PROFONDEUR_CHAISE : 0);
    pts = [[-hx, -hy], [hx, -hy], [hx, hy], [-hx, hy]];
  }
  const a = (e.rot * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return pts.map(([x, y]) => [e.x + x * c - y * s, e.y + x * s + y * c]);
}

function axes(p: Point[]): Point[] {
  return p.map((pt, i) => {
    const q = p[(i + 1) % p.length];
    return [pt[1] - q[1], q[0] - pt[0]];
  });
}

export function chevauchent(A: Point[], B: Point[]) {
  for (const ax of axes(A).concat(axes(B))) {
    let a1 = Infinity, a2 = -Infinity, b1 = Infinity, b2 = -Infinity;
    for (const p of A) { const d = p[0] * ax[0] + p[1] * ax[1]; a1 = Math.min(a1, d); a2 = Math.max(a2, d); }
    for (const p of B) { const d = p[0] * ax[0] + p[1] * ax[1]; b1 = Math.min(b1, d); b2 = Math.max(b2, d); }
    if (a2 < b1 || b2 < a1) return false;
  }
  return true;
}

function distSegment(p: Point, a: Point, b: Point) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
}

// Plus petite distance entre deux contours (0 s'ils se chevauchent)
export function distance(A: Point[], B: Point[]) {
  if (chevauchent(A, B)) return 0;
  let m = Infinity;
  for (const [P, Q] of [[A, B], [B, A]] as const)
    for (const p of P) for (let i = 0; i < Q.length; i++) m = Math.min(m, distSegment(p, Q[i], Q[(i + 1) % Q.length]));
  return m;
}

export type Alerte = { ids: string[]; texte: string };

// Alertes : dépassement de la salle, chevauchement, passage trop étroit, trop d'invités
export function alertes(plan: PlanContenu): { enDefaut: Set<string>; messages: Alerte[] } {
  const enDefaut = new Set<string>();
  const messages: Alerte[] = [];
  const P = plan.items.map(contour);
  plan.items.forEach((e, i) => {
    if (P[i].some(([x, y]) => x < -1 || y < -1 || x > plan.room.w + 1 || y > plan.room.h + 1)) {
      enDefaut.add(e.id);
      messages.push({ ids: [e.id], texte: `${e.name} dépasse de la salle` });
    }
    for (let j = i + 1; j < plan.items.length; j++) {
      const o = plan.items[j];
      if (!estTable(e) && !estTable(o)) continue;
      const d = distance(P[i], P[j]);
      if (d < plan.passage) {
        enDefaut.add(e.id);
        enDefaut.add(o.id);
        messages.push({
          ids: [e.id, o.id],
          texte: d === 0 ? `${e.name} et ${o.name} se chevauchent` : `${e.name} ↔ ${o.name} : ${Math.round(d)} cm de passage (min ${plan.passage})`,
        });
      }
    }
    if (estTable(e) && e.guests.length > places(e)) {
      messages.push({ ids: [e.id], texte: `${e.name} : ${e.guests.length} invités pour ${places(e)} places` });
    }
  });
  return { enDefaut, messages };
}

// Chiffres clés d'un plan
export function resume(plan: PlanContenu) {
  const tables = plan.items.filter(estTable);
  return {
    tables: tables.length,
    places: tables.reduce((s, t) => s + places(t), 0),
    invites: tables.reduce((s, t) => s + t.guests.length, 0),
  };
}

// Vérifie qu'un contenu ressemble bien à un plan (import d'un code de plan)
export function estPlanValide(o: unknown): o is PlanContenu {
  const p = o as PlanContenu;
  return !!p && typeof p === "object" && !!p.room && typeof p.room.w === "number" && typeof p.room.h === "number" && Array.isArray(p.items);
}
