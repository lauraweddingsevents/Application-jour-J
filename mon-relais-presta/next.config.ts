import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ce dossier est une application indépendante : on ne remonte pas au dossier parent
  turbopack: {
    root: __dirname,
    rules: {
      "*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" },
    },
  },
  // Le « service worker » doit toujours être relu, pour recevoir les mises à jour
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
