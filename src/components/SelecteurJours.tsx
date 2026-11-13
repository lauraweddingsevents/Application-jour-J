"use client";
import { jourCourt, type Jour } from "@/lib/jours";

// Rangée des jours du mariage (affichée seulement s'il y en a plusieurs)
export function SelecteurJours({
  jours,
  valeur,
  onChange,
  aujourdhui,
}: {
  jours: Jour[];
  valeur: string;
  onChange: (cle: string) => void;
  aujourdhui?: string;
}) {
  if (jours.length < 2) return null;
  return (
    <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none]" role="tablist" aria-label="Jours du mariage">
      <div className="flex gap-1.5">
        {jours.map((j) => {
          const actif = j.cle === valeur;
          return (
            <button
              key={j.cle}
              type="button"
              role="tab"
              aria-selected={actif}
              onClick={() => onChange(j.cle)}
              className={`flex min-h-[48px] shrink-0 flex-col items-start justify-center rounded-2xl px-3.5 py-1 text-left leading-tight ${
                actif ? "bg-encre text-blanc" : "bg-blanc text-encre ring-1 ring-or-clair/70"
              }`}
            >
              <span className={`text-[11px] ${actif ? "text-or-clair" : "text-encre-doux"}`}>
                {jourCourt(j.date)}
                {aujourdhui === j.date && " · aujourd'hui"}
              </span>
              <span className="text-sm font-medium">{j.titre || "Journée"}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
