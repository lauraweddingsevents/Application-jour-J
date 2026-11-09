"use client";
import { useEffect, type ReactNode } from "react";

// Fenêtre qui monte du bas de l'écran sur téléphone (centrée sur ordinateur)
export function Feuille({
  titre,
  ouverte,
  onFermer,
  children,
}: {
  titre: string;
  ouverte: boolean;
  onFermer: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!ouverte) return;
    const echap = (e: KeyboardEvent) => e.key === "Escape" && onFermer();
    document.addEventListener("keydown", echap);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", echap);
      document.body.style.overflow = "";
    };
  }, [ouverte, onFermer]);

  if (!ouverte) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-encre/40" onClick={onFermer} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titre}
        className="relative max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-[1.75rem] bg-creme p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-[1.75rem]"
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-lg font-medium">{titre}</h2>
          <button
            type="button"
            onClick={onFermer}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-blanc text-xl text-encre-doux"
            aria-label="Fermer"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
