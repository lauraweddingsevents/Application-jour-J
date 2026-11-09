"use client";
// Garde sur le téléphone une copie des dernières données chargées, pour
// pouvoir les afficher sans réseau (lieux de réception qui captent mal).

const PREFIXE = "macoordo:copie:";

export function estErreurReseau(e: unknown) {
  if (typeof navigator !== "undefined" && !navigator.onLine) return true;
  const m = String((e as { message?: string })?.message ?? e).toLowerCase();
  return m.includes("failed to fetch") || m.includes("network") || m.includes("load failed") || m.includes("fetch");
}

function lireCopie<T>(cle: string): { trouve: boolean; valeur?: T } {
  try {
    const copie = localStorage.getItem(PREFIXE + cle);
    if (copie !== null) return { trouve: true, valeur: JSON.parse(copie) as T };
  } catch {}
  return { trouve: false };
}

// Au-delà de ce délai sur un réseau faible, on affiche la copie enregistrée
const DELAI_MS = 8000;

// Exécute le chargement ; sans réseau (ou réseau trop lent), renvoie la dernière copie connue
export async function avecMemoire<T>(cle: string, charger: () => Promise<T>): Promise<T> {
  const copie = lireCopie<T>(cle);
  // Pas de réseau du tout : inutile d'attendre
  if (typeof navigator !== "undefined" && !navigator.onLine && copie.trouve) return copie.valeur as T;

  const chargement = charger().then((resultat) => {
    try {
      localStorage.setItem(PREFIXE + cle, JSON.stringify(resultat));
    } catch {
      // Mémoire pleine ou bloquée : on continue sans copie
    }
    return resultat;
  });

  try {
    if (!copie.trouve) return await chargement;
    const delai = new Promise<"lent">((r) => setTimeout(() => r("lent"), DELAI_MS));
    const gagnant = await Promise.race([chargement, delai]);
    return gagnant === "lent" ? (copie.valeur as T) : gagnant;
  } catch (e) {
    if (estErreurReseau(e) && copie.trouve) return copie.valeur as T;
    throw e;
  }
}

// Efface les copies (à la déconnexion, pour ne rien laisser sur un appareil partagé)
export function effacerMemoire() {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIXE))
      .forEach((k) => localStorage.removeItem(k));
  } catch {}
}
