import type { MetadataRoute } from "next";

// Application installable sur l'écran d'accueil du téléphone
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mon Espace Mariés",
    short_name: "Espace Mariés",
    description: "Votre espace mariés, par Laura Weddings & Events",
    start_url: "/",
    display: "standalone",
    background_color: "#F5EEE4",
    theme_color: "#F5EEE4",
    lang: "fr",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
