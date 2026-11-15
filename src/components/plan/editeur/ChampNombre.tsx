"use client";
// Champ numérique avec boutons − et + (facile au doigt)
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
  const borne = (v: number) => Math.min(max, Math.max(min, v));
  return (
    <label className="flex flex-col gap-1 text-left">
      <span className="text-xs text-encre-doux">{libelle}</span>
      <span className="flex items-center overflow-hidden rounded-xl bg-blanc ring-1 ring-or-clair">
        <button type="button" disabled={desactive} onClick={() => onChange(borne(valeur - pas))} className="h-10 w-10 shrink-0 bg-creme text-lg disabled:opacity-40" aria-label={`Diminuer ${libelle}`}>
          −
        </button>
        <input
          type="number"
          inputMode="numeric"
          value={valeur}
          disabled={desactive}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (!isNaN(v)) onChange(borne(v));
          }}
          className="h-10 w-full min-w-0 bg-transparent text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
        />
        {unite && <span className="pr-1 text-xs text-encre-doux">{unite}</span>}
        <button type="button" disabled={desactive} onClick={() => onChange(borne(valeur + pas))} className="h-10 w-10 shrink-0 bg-creme text-lg disabled:opacity-40" aria-label={`Augmenter ${libelle}`}>
          +
        </button>
      </span>
    </label>
  );
}
