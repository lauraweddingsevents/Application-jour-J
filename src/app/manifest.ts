import type { MetadataRoute } from "next";

// Fiche d'identité de l'application, utilisée quand on l'ajoute à l'écran d'accueil.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ma Coordo",
    short_name: "Ma Coordo",
    description: "Le déroulé du jour J partagé en temps réel.",
    lang: "fr",
    start_url: "/",
    display: "standalone",
    background_color: "#F4EDE4",
    theme_color: "#F4EDE4",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
