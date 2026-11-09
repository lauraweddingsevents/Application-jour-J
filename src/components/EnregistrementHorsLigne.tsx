"use client";
import { useEffect } from "react";

// Installe le « service worker » qui permet de rouvrir les pages sans réseau
export function EnregistrementHorsLigne() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // Pas grave : l'application fonctionne aussi sans
    });
  }, []);
  return null;
}
