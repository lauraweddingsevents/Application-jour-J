"use client";
import { useState } from "react";

// Champ numérique avec boutons − et + (facile au doigt).
// On peut taper librement (ex. 183) : la valeur n'est corrigée qu'en sortant du champ.
export function ChampNombre({
  libelle,
  valeur,
  pas,
  min,
  max,
  unite,
  onChange,
  desactive,
}: {
  libelle: string;
  valeur: number;
  pas: number;
  min: number;
  max: number;
  unite?: string;
  onChange: (v: number) => void;
  desactive?: boolean;
}) {
  const borne = (v: number) => Math.min(max, Math.max(min, Math.round(v)));
  const [texte, setTexte] = useState<string | null>(null); // en cours de saisie
  const valider = () => {
    if (texte === null) return;
    const v = parseFloat(texte.replace(",", "."));
    if (!isNaN(v) && borne(v) !== valeur) onChange(borne(v));
    setTexte(null);
  };
  return (
    <label className="flex flex-col gap-1 text-left">
      <span className="text-xs text-encre-doux">{libelle}</span>
      <span className="flex items-center overflow-hidden rounded-xl bg-blanc ring-1 ring-or-clair">
        <button type="button" disabled={desactive} onClick={() => onChange(borne(valeur - pas))} className="h-10 w-10 shrink-0 bg-creme text-lg disabled:opacity-40" aria-label={`Diminuer ${libelle}`}>
          −
        </button>
        <input
          type="text"
          inputMode="numeric"
          value={texte ?? String(valeur)}
          disabled={desactive}
          onFocus={(e) => e.target.select()}
          onChange={(e) => {
            const t = e.target.value.replace(/[^\d.,]/g, "");
            setTexte(t);
            // Mise à jour en direct quand la valeur tapée est déjà acceptable
            const v = parseFloat(t.replace(",", "."));
            if (!isNaN(v) && v >= min && v <= max) onChange(Math.round(v));
          }}
          onBlur={valider}
          onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
          className="h-10 w-full min-w-0 bg-transparent text-center"
          aria-label={libelle}
        />
        {unite && <span className="pr-1 text-xs text-encre-doux">{unite}</span>}
        <button type="button" disabled={desactive} onClick={() => onChange(borne(valeur + pas))} className="h-10 w-10 shrink-0 bg-creme text-lg disabled:opacity-40" aria-label={`Augmenter ${libelle}`}>
          +
        </button>
      </span>
    </label>
  );
}
