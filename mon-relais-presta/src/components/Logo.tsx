// Nom de l'application, en lettres fines, avec un trait doré
export function Logo({ taille = "normal" }: { taille?: "normal" | "grand" }) {
  const grand = taille === "grand";
  return (
    <span className="inline-flex flex-col items-center leading-none">
      <span className={`font-light tracking-[0.08em] text-encre ${grand ? "text-3xl" : "text-lg"}`}>
        Mon Relais <span className="text-or-fonce">Presta</span>
      </span>
      <span className={`mt-1.5 h-px bg-or ${grand ? "w-24" : "w-12"}`} />
    </span>
  );
}
