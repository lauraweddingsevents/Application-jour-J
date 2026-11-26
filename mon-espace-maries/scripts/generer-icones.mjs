// Génère les icônes de l'application (écran d'accueil, onglet du navigateur).
// Usage : node scripts/generer-icones.mjs — monogramme « EM » bordeaux sur fond beige.
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
const { chromium } = createRequire(import.meta.url)("playwright");

const sortie = new URL("../public/icons/", import.meta.url).pathname;
mkdirSync(sortie, { recursive: true });

function html(taille, marge) {
  const t = Math.round(taille * (1 - marge * 2) * 0.46);
  return `<!doctype html><html><head>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600&display=block" rel="stylesheet">
  <style>html,body{margin:0;width:${taille}px;height:${taille}px;background:#F5EEE4;display:flex;align-items:center;justify-content:center}
  .m{font-family:'Cormorant Garamond',Georgia,serif;font-weight:600;font-size:${t}px;color:#6B1E2E;display:flex;flex-direction:column;align-items:center;line-height:1}
  .l{width:${Math.round(t * 0.8)}px;height:${Math.max(1, Math.round(taille / 64))}px;background:#E07B39;margin-top:${Math.round(t * 0.1)}px;border-radius:9px}</style>
  </head><body><div class="m">EM<div class="l"></div></div></body></html>`;
}

const icones = [["icon-192.png", 192, 0.08], ["icon-512.png", 512, 0.08], ["icon-maskable-512.png", 512, 0.2], ["apple-touch-icon.png", 180, 0.08], ["favicon-32.png", 32, 0]];
const navigateur = await chromium.launch();
for (const [nom, taille, marge] of icones) {
  const page = await navigateur.newPage({ viewport: { width: taille, height: taille } });
  await page.setContent(html(taille, marge), { waitUntil: "networkidle" }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: sortie + nom });
  await page.close();
}
await navigateur.close();
console.log("Icônes générées dans public/icons/");
