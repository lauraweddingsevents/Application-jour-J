/*
  Ma Coordo — « service worker »
  Petit programme installé sur le téléphone qui garde une copie des pages
  et des fichiers de l'application, pour pouvoir rouvrir le déroulé même
  sans réseau (lieux de réception à la campagne).
  Les données du déroulé elles-mêmes sont gardées par la page (mémoire du téléphone).
*/
const VERSION = "macoordo-v4";
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

async function donneesInternes(requete) {
  const cache = await caches.open(VERSION);
  try {
    const reponse = await fetch(requete);
    if (reponse.ok) cache.put(requete, reponse.clone());
    return reponse;
  } catch {
    const copie = await cache.match(requete);
    if (copie) return copie;
    throw new Error("hors ligne");
  }
}

self.addEventListener("fetch", (evenement) => {
  const requete = evenement.request;
  if (requete.method !== "GET") return;
  const url = new URL(requete.url);
  if (url.origin !== self.location.origin) return; // Supabase, Google Fonts… : pas touché
  if (requete.headers.get("RSC")) {
    // Données internes de l'application (seconde partie d'une page, navigation) :
    // d'abord le réseau, sinon la copie enregistrée
    evenement.respondWith(donneesInternes(requete));
    return;
  }

  if (estFichierFixe(url)) {
    evenement.respondWith(copieDabord(requete));
  } else if (requete.mode === "navigate") {
    evenement.respondWith(reseauDabord(requete));
  }
});

// La page demande de copier tout de suite ses fichiers (et elle-même)
self.addEventListener("message", (evenement) => {
  const donnees = evenement.data || {};
  if (donnees.type !== "copier" || !Array.isArray(donnees.urls)) return;
  evenement.waitUntil(
    caches.open(VERSION).then((cache) =>
      Promise.allSettled(
        donnees.urls
          .filter((u) => typeof u === "string" && new URL(u).origin === self.location.origin)
          .map(async (u) => {
            const url = new URL(u);
            // Les fichiers fixes déjà copiés ne sont pas retéléchargés
            if (estFichierFixe(url) && (await cache.match(u))) return;
            const reponse = await fetch(u, { credentials: "same-origin" });
            if (reponse.ok) await cache.put(u, reponse);
          }),
      ),
    ),
  );
});

// ---------------------------------------------------------------------
// Alertes : affichage des notifications reçues
// ---------------------------------------------------------------------
self.addEventListener("push", (evenement) => {
  let n = { titre: "Ma Coordo", texte: "", url: "/", etiquette: "ma-coordo" };
  try {
    n = { ...n, ...evenement.data.json() };
  } catch {}
  evenement.waitUntil(
    self.registration.showNotification(n.titre, {
      body: n.texte,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: n.etiquette,
      renotify: true,
      vibrate: [200, 100, 200, 100, 200],
      data: { url: n.url },
    }),
  );
});

// Toucher la notification ouvre (ou réaffiche) le déroulé
self.addEventListener("notificationclick", (evenement) => {
  evenement.notification.close();
  const url = new URL((evenement.notification.data && evenement.notification.data.url) || "/", self.location.origin).href;
  evenement.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((fenetres) => {
      const ouverte = fenetres.find((f) => f.url.split("?")[0] === url);
      if (ouverte) return ouverte.focus();
      return self.clients.openWindow(url);
    }),
  );
});
