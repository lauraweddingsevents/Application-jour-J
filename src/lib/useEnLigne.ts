"use client";
import { useSyncExternalStore } from "react";

function abonner(rappel: () => void) {
  window.addEventListener("online", rappel);
  window.addEventListener("offline", rappel);
  return () => {
    window.removeEventListener("online", rappel);
    window.removeEventListener("offline", rappel);
  };
}

// Vrai si le téléphone a du réseau
export function useEnLigne() {
  return useSyncExternalStore(abonner, () => navigator.onLine, () => true);
}
