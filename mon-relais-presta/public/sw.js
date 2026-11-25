/*
  Mon Relais Presta — « service worker »
  Petit programme installé sur le téléphone : il permet d'installer
  l'application sur l'écran d'accueil, d'afficher une page de secours
  sans réseau, et de recevoir les notifications.
*/
const VERSION = "relais-v1";
const PAGE_HORS_LIGNE = "/hors-ligne";

self.addEventListener("install", (evenement) => {
  evenement.waitUntil(caches.open(VERSION).then((cache) => cache.addAll([PAGE_HORS_LIGNE, "/icons/icon-192.png"])));
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

// Pages : toujours le réseau (les demandes changent vite) ; sans réseau, la page de secours
self.addEventListener("fetch", (evenement) => {
  const requete = evenement.request;
  if (requete.method !== "GET" || requete.mode !== "navigate") return;
  evenement.respondWith(
    fetch(requete).catch(async () => (await caches.match(PAGE_HORS_LIGNE)) || Response.error()),
  );
});

// Notifications reçues
self.addEventListener("push", (evenement) => {
  let n = { titre: "Mon Relais Presta", texte: "", url: "/demandes" };
  try {
    n = { ...n, ...evenement.data.json() };
  } catch {}
  evenement.waitUntil(
    self.registration.showNotification(n.titre, {
      body: n.texte,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: n.url,
      data: { url: n.url },
    }),
  );
});

// Toucher la notification ouvre la demande concernée
self.addEventListener("notificationclick", (evenement) => {
  evenement.notification.close();
  const url = new URL((evenement.notification.data && evenement.notification.data.url) || "/demandes", self.location.origin).href;
  evenement.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((fenetres) => {
      const ouverte = fenetres.find((f) => f.url.split("?")[0] === url);
      if (ouverte) return ouverte.focus();
      if (fenetres[0] && "navigate" in fenetres[0]) return fenetres[0].navigate(url).then((f) => f && f.focus());
      return self.clients.openWindow(url);
    }),
  );
});
