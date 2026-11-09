"use client";
import { useEffect } from "react";

// Installe le « service worker » qui permet de rouvrir les pages sans réseau,
// puis lui demande de copier tout de suite la page affichée et tous ses
// fichiers (sinon certains téléphones n'en gardent qu'une partie).
export function EnregistrementHorsLigne() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;

    function fichiersDeLaPage() {
      const origine = window.location.origin;
      const urls = new Set<string>([window.location.href.split("#")[0]]);
      for (const e of performance.getEntriesByType("resource")) {
        if (e.name.startsWith(origine) && !e.name.includes("/rest/") && !e.name.includes("_rsc")) urls.add(e.name);
      }
      document.querySelectorAll<HTMLScriptElement>("script[src]").forEach((s) => urls.add(s.src));
      document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"], link[rel="preload"], link[rel="manifest"], link[rel="icon"], link[rel="apple-touch-icon"]').forEach((l) => l.href && urls.add(l.href));
      return [...urls].filter((u) => u.startsWith(origine));
    }

    async function enregistrer() {
      try {
        await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        const pret = await navigator.serviceWorker.ready;
        pret.active?.postMessage({ type: "copier", urls: fichiersDeLaPage() });
      } catch {
        // Pas grave : l'application fonctionne aussi sans
      }
    }

    if (document.readyState === "complete") enregistrer();
    else window.addEventListener("load", enregistrer, { once: true });
  }, []);
  return null;
}
