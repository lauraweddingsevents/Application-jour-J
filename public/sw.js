/*
  Ma Coordo — « service worker »
  Petit programme installé sur le téléphone qui garde une copie des pages
  et des fichiers de l'application, pour pouvoir rouvrir le déroulé même
  sans réseau (lieux de réception à la campagne).
  Les données du déroulé elles-mêmes sont gardées par la page (mémoire du téléphone).
*/
const VERSION = "macoordo-v1";
const PAGE_HORS_LIGNE = "/hors-ligne";
// Au-delà de ce délai sur un réseau faible, on affiche la copie enregistrée
const DELAI_RESEAU_MS = 4000;

self.addEventListener("install", (evenement) => {
  evenement.waitUntil(
    caches.open(VERSION).then((cache) => cache.addAll([PAGE_HORS_LIGNE, "/icons/icon-192.png"])),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (evenement) => {
  evenement.waitUntil(
    caches
      .keys()
      .then((cles) => Promise.all(cles.filter((c) => c !== VERSION).map((c) => caches.delete(c))))
      .then(() => self.clients.claim()),
  );
});

function estFichierFixe(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.endsWith(".woff2")
  );
}

// Fichiers qui ne changent jamais : d'abord la copie, sinon le réseau
async function copieDabord(requete) {
  const cache = await caches.open(VERSION);
  const copie = await cache.match(requete);
  if (copie) return copie;
  const reponse = await fetch(requete);
  if (reponse.ok) cache.put(requete, reponse.clone());
  return reponse;
}

// Pages : d'abord le réseau (pour avoir la dernière version), sinon la copie
async function reseauDabord(requete) {
  const cache = await caches.open(VERSION);
  const depuisReseau = fetch(requete).then((reponse) => {
    if (reponse.ok) cache.put(requete, reponse.clone());
    return reponse;
  });
  const copie = await cache.match(requete, { ignoreSearch: true });
  try {
    if (!copie) return await depuisReseau;
    // Réseau trop lent : on montre la copie sans attendre
    const delai = new Promise((resoudre) => setTimeout(() => resoudre(null), DELAI_RESEAU_MS));
    const gagnant = await Promise.race([depuisReseau, delai]);
    return gagnant || copie;
  } catch {
    return copie || (await cache.match(PAGE_HORS_LIGNE)) || Response.error();
  }
}

self.addEventListener("fetch", (evenement) => {
  const requete = evenement.request;
  if (requete.method !== "GET") return;
  const url = new URL(requete.url);
  if (url.origin !== self.location.origin) return; // Supabase, Google Fonts… : pas touché
  if (requete.headers.get("RSC")) return; // navigation interne de l'application

  if (estFichierFixe(url)) {
    evenement.respondWith(copieDabord(requete));
  } else if (requete.mode === "navigate") {
    evenement.respondWith(reseauDabord(requete));
  }
});
