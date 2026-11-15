// Logo provisoire de « Mon plan de salle » (même esprit que Ma Coordo)
export function LogoPlan({ taille = "normal" }: { taille?: "normal" | "grand" }) {
  const grand = taille === "grand";
  return (
    <span className="inline-flex flex-col items-center leading-none">
      <span className={`font-light uppercase tracking-[0.16em] text-encre ${grand ? "text-2xl" : "text-base"}`}>
        Mon plan de salle
      </span>
      <span aria-hidden className={`mt-2 block h-px bg-or ${grand ? "w-16" : "w-10"}`} />
    </span>
  );
}
