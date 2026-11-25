// Fiche d'identité de l'application, utilisée quand on l'ajoute à l'écran d'accueil
export function GET() {
  const contenu = {
    id: "/demandes",
    name: "Mon Relais Presta",
    short_name: "Relais Presta",
    description: "L'entraide entre prestataires mariage : transmettez et suivez les demandes de mariés.",
    lang: "fr",
    start_url: "/demandes",
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
  return new Response(JSON.stringify(contenu), {
    headers: { "Content-Type": "application/manifest+json; charset=utf-8" },
  });
}
