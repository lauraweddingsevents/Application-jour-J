"use client";
import { heureAffichee } from "@/lib/heures";

type MomentCourt = { id: string; titre: string; debut: string; fin: string | null; raccourci?: boolean };

// Fait défiler jusqu'à un moment et le met brièvement en valeur
export function allerAuMoment(id: string) {
  const el = document.getElementById(`moment-${id}`);
  if (!el) return false;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  el.classList.add("mis-en-valeur");
  setTimeout(() => el.classList.remove("mis-en-valeur"), 1800);
  return true;
}

function libelleCourt(titre: string) {
  const t = titre.replace(/^(la |le |les |l')/i, "");
  return t.length > 18 ? `${t.slice(0, 17).trim()}…` : t;
}

// Petite rangée de boutons pour aller directement aux temps forts
export function Raccourcis({
  moments,
  tz,
  maintenant,
  onAller,
}: {
  moments: MomentCourt[];
  tz: string;
  maintenant: number;
  onAller: (id: string) => void;
}) {
  const tempsForts = moments.filter((m) => m.raccourci);
  if (tempsForts.length === 0) return null;

  // « Maintenant » : le moment en cours, sinon le prochain
  const enCours = [...moments]
    .reverse()
    .find((m) => new Date(m.debut).getTime() <= maintenant && (!m.fin || new Date(m.fin).getTime() > maintenant));
  const prochain = moments.find((m) => new Date(m.debut).getTime() > maintenant);
  const cible = enCours ?? prochain;

  return (
    <div className="-mx-4 overflow-x-auto px-4 pt-2 [scrollbar-width:none]" aria-label="Aller directement à">
      <div className="flex gap-1.5">
        {cible && (
          <button
            type="button"
            onClick={() => onAller(cible.id)}
            className="flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-full bg-encre px-3 text-xs font-medium text-blanc"
          >
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-or-clair" />
            Maintenant
          </button>
        )}
        {tempsForts.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => onAller(m.id)}
            className="min-h-[36px] shrink-0 rounded-full bg-blanc px-3 text-xs text-encre ring-1 ring-or-clair/70"
          >
            {libelleCourt(m.titre)} <span className="text-encre-doux">{heureAffichee(m.debut, tz)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
