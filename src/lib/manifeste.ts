// Fiche d'identité de l'application, utilisée quand on l'ajoute à l'écran d'accueil.
export function manifeste(options: { nom: string; nomCourt: string; adresseDepart: string; id: string }) {
  return {
    id: options.id,
    name: options.nom,
    short_name: options.nomCourt,
    description: "Le déroulé du jour J partagé en temps réel.",
    lang: "fr",
    start_url: options.adresseDepart,
    scope: "/",
    display: "standalone",
    background_color: "#F4EDE4",
    theme_color: "#F4EDE4",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

export function reponseManifeste(contenu: object) {
  return new Response(JSON.stringify(contenu), {
    headers: { "Content-Type": "application/manifest+json; charset=utf-8" },
  });
}
