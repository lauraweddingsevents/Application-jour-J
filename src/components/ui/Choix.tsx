"use client";
// Boutons à bascule (ex. « Prestataire » / « Proche »), faciles à toucher
export function Choix<T extends string>({
  libelle,
  options,
  valeur,
  onChange,
}: {
  libelle: string;
  options: { valeur: T; texte: string }[];
  valeur: T;
  onChange: (v: T) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-sm font-medium">{libelle}</legend>
      <div className="grid grid-flow-col auto-cols-fr gap-1 rounded-full bg-creme-fonce p-1">
        {options.map((o) => (
          <button
            key={o.valeur}
            type="button"
            aria-pressed={valeur === o.valeur}
            onClick={() => onChange(o.valeur)}
            className={`min-h-[44px] whitespace-nowrap rounded-full px-2 text-sm font-medium transition-colors ${
              valeur === o.valeur ? "bg-blanc text-encre shadow-sm" : "text-encre-doux"
            }`}
          >
            {o.texte}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
