// Calculs du plan de salle, repris du prototype et enrichis :
// places par table, contours (chaises comprises), chevauchements, passages
// trop étroits, éléments hors de la salle (y compris salle en L), ouverture
// des portes, récapitulatif, numérotation des tables, import d'invités.
import { contourSalle, dansSalle } from "./salle";
import { MENUS, type Element, type Invite, type Menu, type PlanContenu, type Point, type Table } from "./types";

export const PROFONDEUR_CHAISE = 55; // profondeur chaise + dégagement (cm)

export const estTable = (e: Element): e is Table => e.type === "round" || e.type === "rect";
// Éléments posés sur les murs (portes, fenêtres) : pas contrôlés comme les autres
export const estSurMur = (e: Element) => e.type === "porte" || e.type === "fenetre";

export function places(e: Element) {
  if (e.type === "round") return e.chairs;
  if (e.type === "rect") return 2 * e.sides + 2 * e.ends;
  return 0;
}

function tourner(e: Element, pts: Point[]): Point[] {
  const a = (e.rot * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return pts.map(([x, y]) => [e.x + x * c - y * s, e.y + x * s + y * c]);
}

// Contour d'un élément (chaises comprises ; pour une porte : la zone d'ouverture)
export function contour(e: Element): Point[] {
  if (e.type === "round" || (e.type === "pillar" && e.shape === "round")) {
    const n = 20;
    const rayon = e.type === "pillar" ? e.L / 2 : e.d / 2 + (e.chairs ? PROFONDEUR_CHAISE : 0);
    const r = rayon / Math.cos(Math.PI / n);
    const pts: Point[] = [];
    for (let i = 0; i < n; i++) {
      const a = (2 * Math.PI * i) / n;
      pts.push([r * Math.cos(a), r * Math.sin(a)]);
    }
    return tourner(e, pts);
  }
  if (e.type === "porte") {
    // Zone balayée par la porte, côté intérieur (y positif)
    return tourner(e, [[-e.L / 2, 0], [e.L / 2, 0], [e.L / 2, e.L], [-e.L / 2, e.L]]);
  }
  let L: number, W: number;
  if (e.type === "pillar") [L, W] = [e.L, e.L];
  else if (e.type === "fenetre") [L, W] = [e.L, 16];
  else [L, W] = [e.L, e.W];
  const hx = L / 2 + (e.type === "rect" && e.ends ? PROFONDEUR_CHAISE : 0);
  const hy = W / 2 + (e.type === "rect" && e.sides ? PROFONDEUR_CHAISE : 0);
  return tourner(e, [[-hx, -hy], [hx, -hy], [hx, hy], [-hx, hy]]);
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

// Un point est-il strictement à l'intérieur d'un contour convexe ?
function dansConvexe([x, y]: Point, c: Point[]) {
  let signe = 0;
  for (let i = 0; i < c.length; i++) {
    const [ax, ay] = c[i];
    const [bx, by] = c[(i + 1) % c.length];
    const v = (bx - ax) * (y - ay) - (by - ay) * (x - ax);
    if (Math.abs(v) < 1e-6) return false;
    const s = Math.sign(v);
    if (signe && s !== signe) return false;
    signe = s;
  }
  return true;
}

export type Alerte = { ids: string[]; texte: string };

// Alertes : dépassement de la salle, chevauchement, passage trop étroit,
// porte gênée, trop d'invités
export function alertes(plan: PlanContenu): { enDefaut: Set<string>; messages: Alerte[] } {
  const enDefaut = new Set<string>();
  const messages: Alerte[] = [];
  const salle = contourSalle(plan.room);
  const P = plan.items.map(contour);
  plan.items.forEach((e, i) => {
    if (!estSurMur(e)) {
      const dehors = P[i].some((p) => !dansSalle(p, salle)) || salle.some((coin) => dansConvexe(coin, P[i]));
      if (dehors) {
        enDefaut.add(e.id);
        messages.push({ ids: [e.id], texte: `${e.name} dépasse de la salle` });
      }
    }
    for (let j = i + 1; j < plan.items.length; j++) {
      const o = plan.items[j];
      if (e.type === "fenetre" || o.type === "fenetre") continue;
      const porte = e.type === "porte" ? e : o.type === "porte" ? o : null;
      if (porte) {
        const autre = porte === e ? o : e;
        if (autre.type === "porte" || autre.type === "zone") continue;
        if (chevauchent(P[i], P[j])) {
          enDefaut.add(autre.id);
          messages.push({ ids: [e.id, o.id], texte: `${autre.name} gêne l'ouverture de ${porte.name}` });
        }
        continue;
      }
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
    nonPlaces: plan.nonPlaces?.length ?? 0,
  };
}

// « 1 table », « 5 tables »…
export const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;

// Nombre de menus de chaque sorte (hors menu standard) : « 2 végé, 1 enfant »
export function compteMenus(invites: Invite[]) {
  const c = new Map<Menu, number>();
  for (const i of invites) if (i.menu && i.menu !== "standard") c.set(i.menu, (c.get(i.menu) ?? 0) + 1);
  return MENUS.filter((m) => c.has(m.valeur)).map((m) => ({ menu: m.valeur, texte: m.court, nombre: c.get(m.valeur)! }));
}

export function texteMenus(invites: Invite[]) {
  return compteMenus(invites)
    .map((m) => `${m.nombre} ${m.texte}`)
    .join(", ");
}

// Récapitulatif : matériel, zones, placement (pour le traiteur, le loueur, les mariés)
export function recapitulatif(plan: PlanContenu) {
  const tables = plan.items.filter(estTable);
  const r = resume(plan);
  const materiel = new Map<string, number>();
  for (const t of tables) {
    const k = t.type === "round" ? `table ronde Ø${t.d} cm` : `table rectangulaire ${t.L}×${t.W} cm`;
    materiel.set(k, (materiel.get(k) ?? 0) + 1);
  }
  const tousInvites = tables.flatMap((t) => t.guests);
  let s = `${plan.name}\nSalle : ${(plan.room.w / 100).toLocaleString("fr-FR")} × ${(plan.room.h / 100).toLocaleString("fr-FR")} m${plan.room.points ? " (en L)" : ""}\n`;
  s += `${pluriel(r.tables, "table")} · ${pluriel(r.places, "place")} · ${pluriel(r.invites, "invité")} placé${r.invites > 1 ? "s" : ""}`;
  if (r.nonPlaces) s += ` · ${r.nonPlaces} non placé${r.nonPlaces > 1 ? "s" : ""}`;
  s += "\n\nMATÉRIEL\n";
  for (const [k, n] of materiel) s += `- ${n} × ${k}\n`;
  s += `- ${r.places} chaises\n`;
  const autres = (type: Element["type"], titre: string) => {
    const l = plan.items.filter((i) => i.type === type);
    if (l.length) s += `\n${titre}\n` + l.map((z) => `- ${z.name}${"L" in z && "W" in z ? ` (${z.L / 100} × ${(z as { W: number }).W / 100} m)` : ""}`).join("\n") + "\n";
  };
  autres("zone", "ZONES");
  autres("estrade", "ESTRADE");
  const poteaux = plan.items.filter((i) => i.type === "pillar").length;
  if (poteaux) s += `\n${pluriel(poteaux, "poteau")} dans la salle\n`;
  const menus = texteMenus(tousInvites);
  if (menus) s += `\nMENUS PARTICULIERS\n${menus}\n`;
  s += "\nPLACEMENT\n";
  for (const t of tables) {
    const m = texteMenus(t.guests);
    s += `\n${t.name} (${t.guests.length}/${places(t)})${m ? ` — ${m}` : ""}\n`;
    for (const g of t.guests) {
      const menu = MENUS.find((x) => x.valeur === g.menu)?.court;
      s += `  · ${g.nom}${menu ? ` (${menu}${g.note ? ` : ${g.note}` : ""})` : ""}\n`;
    }
  }
  if (plan.nonPlaces?.length) s += `\nNON PLACÉS\n` + plan.nonPlaces.map((g) => `  · ${g.nom}`).join("\n") + "\n";
  return s;
}

// Renumérote « Table 1, 2, 3… » de gauche à droite et de haut en bas.
// Les tables au nom personnalisé (« Table d'honneur ») gardent leur nom.
export function numeroterTables(plan: PlanContenu): PlanContenu {
  const numerotables = plan.items.filter((e) => estTable(e) && /^Table \d+$/.test(e.name));
  const rangee = 200; // tables à moins de 2 m de hauteur d'écart : même rangée
  const tries = [...numerotables].sort((a, b) => (Math.abs(a.y - b.y) < rangee ? a.x - b.x : a.y - b.y));
  const noms = new Map(tries.map((t, i) => [t.id, `Table ${i + 1}`]));
  return { ...plan, items: plan.items.map((e) => (noms.has(e.id) ? { ...e, name: noms.get(e.id)! } : e)) };
}

// Lecture d'une liste d'invités collée ou issue d'un fichier CSV.
// Une ligne par invité : « Nom », ou « Nom ; Table ; Menu » (séparateur ; , ou tabulation)
export function lireListeInvites(texte: string): { nom: string; table?: string; menu?: Menu }[] {
  const lignes = texte.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lignes.length) return [];
  const sep = [";", "\t", ","].find((s) => lignes[0].includes(s));
  const decouper = (l: string) => (sep ? l.split(sep).map((c) => c.trim().replace(/^"|"$/g, "")) : [l]);
  let debut = 0;
  if (/^(nom|invit|prénom|prenom)/i.test(decouper(lignes[0])[0])) debut = 1; // ligne d'en-tête
  return lignes.slice(debut).map((l) => {
    const [nom, table, menu] = decouper(l);
    return { nom, table: table || undefined, menu: deviner(menu) };
  }).filter((i) => i.nom);
}

function deviner(menu?: string): Menu | undefined {
  if (!menu) return undefined;
  const m = menu.toLowerCase();
  if (/enfant/.test(m)) return "enfant";
  if (/v[ée]g[ée]tal|v[ée]gan/.test(m)) return "vegan";
  if (/v[ée]g/.test(m)) return "vegetarien";
  if (/pesc|poisson/.test(m)) return "pescetarien";
  if (/porc/.test(m)) return "sans_porc";
  if (/halal/.test(m)) return "halal";
  if (/casher|kasher|cacher/.test(m)) return "casher";
  if (/standard|normal|classique|adulte/.test(m)) return "standard";
  return "autre";
}

// Retrouve une table à partir de ce qui est écrit dans la liste (« 3 », « Table 3 », « Honneur »)
export function trouverTable(plan: PlanContenu, texte: string) {
  const t = texte.trim().toLowerCase();
  const tables = plan.items.filter(estTable);
  return (
    tables.find((x) => x.name.toLowerCase() === t) ??
    (/^\d+$/.test(t) ? tables.find((x) => x.name.toLowerCase() === `table ${t}`) : undefined) ??
    tables.find((x) => x.name.toLowerCase().includes(t))
  );
}

// Vérifie qu'un contenu ressemble bien à un plan (import d'un code de plan)
export function estPlanValide(o: unknown): o is PlanContenu {
  const p = o as PlanContenu;
  return !!p && typeof p === "object" && !!p.room && typeof p.room.w === "number" && typeof p.room.h === "number" && Array.isArray(p.items);
}
