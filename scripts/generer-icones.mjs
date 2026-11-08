// Génère les icônes de l'application (écran d'accueil, onglet du navigateur).
// Usage : node scripts/generer-icones.mjs
// Icône provisoire en attendant le logo définitif.
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
import { mkdirSync } from "node:fs";

const sortie = new URL("../public/icons/", import.meta.url).pathname;
mkdirSync(sortie, { recursive: true });

function html(taille, marge) {
  const t = Math.round(taille * (1 - marge * 2) * 0.42);
  return `<!doctype html><html><head>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300&display=block" rel="stylesheet">
  <style>html,body{margin:0;width:${taille}px;height:${taille}px;background:#F4EDE4;display:flex;align-items:center;justify-content:center}
  .m{font-family:Poppins;font-weight:300;font-size:${t}px;color:#3B3330;letter-spacing:.04em;display:flex;flex-direction:column;align-items:center}
  .l{width:${Math.round(t * 0.9)}px;height:${Math.max(1, Math.round(taille / 90))}px;background:#A07E5E;margin-top:${Math.round(t * 0.08)}px}</style>
  </head><body><div class="m">MC<div class="l"></div></div></body></html>`;
}

const icones = [
  ["icon-192.png", 192, 0.08],
  ["icon-512.png", 512, 0.08],
  ["icon-maskable-512.png", 512, 0.2],
  ["apple-touch-icon.png", 180, 0.08],
  ["favicon-32.png", 32, 0],
];

const navigateur = await chromium.launch();
for (const [nom, taille, marge] of icones) {
  const page = await navigateur.newPage({ viewport: { width: taille, height: taille } });
  await page.setContent(html(taille, marge), { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: sortie + nom });
  await page.close();
}
await navigateur.close();
console.log("Icônes générées dans public/icons/");
