// Logo provisoire (texte) en attendant le vrai logo de Laura.
export function Logo({ taille = "normal" }: { taille?: "normal" | "grand" }) {
  const grand = taille === "grand";
  return (
    <span className="inline-flex flex-col items-center leading-none">
      <span
        className={`font-light tracking-[0.18em] uppercase text-encre ${grand ? "text-3xl" : "text-lg"}`}
      >
        Ma Coordo
      </span>
      <span
        aria-hidden
        className={`mt-2 block h-px bg-or ${grand ? "w-16" : "w-10"}`}
      />
    </span>
  );
}
