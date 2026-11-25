"use client";
// Choix multiples sous forme de grosses pastilles à toucher
export function Puces<T extends string>({
  libelle,
  aide,
  options,
  valeurs,
  onChange,
  unique = false,
}: {
  libelle: string;
  aide?: string;
  options: { valeur: T; texte: string }[];
  valeurs: T[];
  onChange: (v: T[]) => void;
  unique?: boolean;
}) {
  function basculer(v: T) {
    if (unique) return onChange([v]);
    onChange(valeurs.includes(v) ? valeurs.filter((x) => x !== v) : [...valeurs, v]);
  }
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-sm font-medium">{libelle}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const actif = valeurs.includes(o.valeur);
          return (
            <button
              key={o.valeur}
              type="button"
              aria-pressed={actif}
              onClick={() => basculer(o.valeur)}
              className={`min-h-[44px] rounded-full border px-4 text-sm font-medium transition-colors ${
                actif ? "border-or bg-or text-blanc" : "border-or-clair bg-blanc text-encre"
              }`}
            >
              {o.texte}
            </button>
          );
        })}
      </div>
      {aide && <span className="text-sm text-encre-doux">{aide}</span>}
    </fieldset>
  );
}
