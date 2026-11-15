// Forme de la salle : rectangle, ou salle en L (contour à coins)
import type { Point, Salle } from "./types";

export type CoinL = "haut-droite" | "haut-gauche" | "bas-droite" | "bas-gauche";

export function contourSalle(s: Salle): Point[] {
  return s.points && s.points.length >= 3 ? s.points : [[0, 0], [s.w, 0], [s.w, s.h], [0, s.h]];
}

// Salle en L : rectangle w × h auquel on retire un rectangle (dw × dh) dans un coin
export function salleEnL(w: number, h: number, dw: number, dh: number, coin: CoinL): Salle {
  const a = Math.max(50, Math.min(dw, w - 50));
  const b = Math.max(50, Math.min(dh, h - 50));
  const pts: Record<CoinL, Point[]> = {
    "haut-droite": [[0, 0], [w - a, 0], [w - a, b], [w, b], [w, h], [0, h]],
    "haut-gauche": [[a, 0], [w, 0], [w, h], [0, h], [0, b], [a, b]],
    "bas-droite": [[0, 0], [w, 0], [w, h - b], [w - a, h - b], [w - a, h], [0, h]],
    "bas-gauche": [[0, 0], [w, 0], [w, h], [a, h], [a, h - b], [0, h - b]],
  };
  return { w, h, points: pts[coin] };
}

// Retrouve les réglages d'une salle en L à partir de son contour
export function lireSalleEnL(s: Salle): { dw: number; dh: number; coin: CoinL } | null {
  if (!s.points || s.points.length !== 6) return null;
  const coins: CoinL[] = ["haut-droite", "haut-gauche", "bas-droite", "bas-gauche"];
  for (const coin of coins) {
    // On teste toutes les découpes possibles à partir des coordonnées présentes
    const xs = [...new Set(s.points.map((p) => p[0]))];
    const ys = [...new Set(s.points.map((p) => p[1]))];
    for (const x of xs)
      for (const y of ys) {
        const dw = coin.endsWith("droite") ? s.w - x : x;
        const dh = coin.startsWith("haut") ? y : s.h - y;
        if (dw <= 0 || dh <= 0) continue;
        const essai = salleEnL(s.w, s.h, dw, dh, coin).points!;
        if (JSON.stringify(essai) === JSON.stringify(s.points)) return { dw, dh, coin };
      }
  }
  return null;
}

// Le point est-il dans la salle ? (bord compris, tolérance 1 cm)
export function dansSalle([x, y]: Point, contour: Point[]) {
  // Sur un bord : dedans
  for (let i = 0; i < contour.length; i++) {
    const a = contour[i];
    const b = contour[(i + 1) % contour.length];
    const lg = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (Math.abs(Math.hypot(x - a[0], y - a[1]) + Math.hypot(x - b[0], y - b[1]) - lg) < 1) return true;
  }
  let dedans = false;
  for (let i = 0, j = contour.length - 1; i < contour.length; j = i++) {
    const [xi, yi] = contour[i];
    const [xj, yj] = contour[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dedans = !dedans;
  }
  return dedans;
}

export function surfaceSalle(contour: Point[]) {
  let s = 0;
  for (let i = 0; i < contour.length; i++) {
    const [x1, y1] = contour[i];
    const [x2, y2] = contour[(i + 1) % contour.length];
    s += x1 * y2 - x2 * y1;
  }
  return Math.abs(s) / 2 / 10_000; // m²
}
