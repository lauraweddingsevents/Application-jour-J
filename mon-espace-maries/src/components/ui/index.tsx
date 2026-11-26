// Éléments d'interface communs, d'après la maquette (beige, bordeaux, tangerine).
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variante = "principal" | "secondaire" | "contour" | "discret" | "danger";

const VARIANTES: Record<Variante, string> = {
  principal: "bg-bordeaux text-fond hover:bg-bordeaux-fonce",
  secondaire: "bg-white text-encre border border-champ hover:border-bordeaux",
  contour: "bg-transparent text-bordeaux border-[1.5px] border-bordeaux hover:bg-bordeaux-pale",
  discret: "bg-transparent text-bordeaux underline-offset-4 hover:underline px-1!",
  danger: "bg-white text-rouge border border-champ hover:border-rouge",
};

const BASE =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50";

export function Bouton({ variante = "principal", className = "", type = "button", ...props }: ComponentProps<"button"> & { variante?: Variante }) {
  return <button type={type} className={`${BASE} ${VARIANTES[variante]} ${className}`} {...props} />;
}

export function BoutonLien({ variante = "principal", className = "", ...props }: ComponentProps<typeof Link> & { variante?: Variante }) {
  return <Link className={`${BASE} ${VARIANTES[variante]} ${className}`} {...props} />;
}

export function Carte({ className = "", ...props }: ComponentProps<"section">) {
  return <section className={`rounded-2xl border border-trait bg-carte p-4 sm:p-5 ${className}`} {...props} />;
}

export function TitreCarte({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <h2 className={`font-titre text-[22px] font-semibold leading-tight ${className}`}>{children}</h2>;
}

export function Surtitre({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`text-[11px] font-semibold uppercase tracking-[0.12em] text-bordeaux ${className}`}>{children}</p>;
}

// En-tête d'une page : titre en Cormorant + phrase d'introduction
export function EnTetePage({ titre, intro, action }: { titre: string; intro?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div className="flex flex-col gap-1">
        <h1 className="font-titre text-[30px] font-semibold leading-tight lg:text-[36px]">{titre}</h1>
        {intro && <p className="text-sm text-doux">{intro}</p>}
      </div>
      {action}
    </div>
  );
}

const CLASSE_CHAMP =
  "min-h-11 w-full rounded-[10px] border border-champ bg-white px-3 text-[15px] text-encre placeholder:text-doux/60 focus:border-bordeaux focus:outline-none";

export function Champ({ libelle, aide, id, className = "", ...props }: ComponentProps<"input"> & { libelle: string; aide?: string; id: string }) {
  return (
    <label htmlFor={id} className={`flex flex-col gap-1 text-xs text-doux ${className}`}>
      {libelle}
      <input id={id} className={CLASSE_CHAMP} {...props} />
      {aide && <span className="text-xs text-doux">{aide}</span>}
    </label>
  );
}

export function ZoneTexte({ libelle, id, className = "", ...props }: ComponentProps<"textarea"> & { libelle: string; id: string }) {
  return (
    <label htmlFor={id} className={`flex flex-col gap-1 text-xs text-doux ${className}`}>
      {libelle}
      <textarea id={id} className={`${CLASSE_CHAMP} min-h-24 py-2 leading-relaxed`} {...props} />
    </label>
  );
}

export function Selecteur({
  libelle, id, options, className = "", ...props
}: ComponentProps<"select"> & { libelle: string; id: string; options: { valeur: string; texte: string }[] }) {
  return (
    <label htmlFor={id} className={`flex flex-col gap-1 text-xs text-doux ${className}`}>
      {libelle}
      <select id={id} className={`${CLASSE_CHAMP} px-2`} {...props}>
        {options.map((o) => (
          <option key={o.valeur} value={o.valeur}>{o.texte}</option>
        ))}
      </select>
    </label>
  );
}

export type Ton = "vert" | "orange" | "rouge" | "neutre" | "bordeaux";
const TONS: Record<Ton, string> = {
  vert: "bg-vert-pale text-vert",
  orange: "bg-orange-pale text-orange",
  rouge: "bg-rouge-pale text-rouge",
  neutre: "bg-neutre-pale text-doux",
  bordeaux: "bg-bordeaux-pale text-bordeaux",
};

export function Pastille({ ton, children, className = "" }: { ton: Ton; children: ReactNode; className?: string }) {
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${TONS[ton]} ${className}`}>{children}</span>;
}

export const TON_STATUT = { termine: "vert", en_cours: "orange", pas_commence: "rouge" } as const;

export function BarreProgression({ pourcentage, className = "" }: { pourcentage: number; className?: string }) {
  return (
    <div className={`h-2 overflow-hidden rounded-full bg-piste ${className}`} role="progressbar" aria-valuenow={pourcentage} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-2 rounded-full bg-tangerine transition-all" style={{ width: `${pourcentage}%` }} />
    </div>
  );
}

export function Vide({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl border border-dashed border-champ px-4 py-8 text-center text-sm text-doux">{children}</p>;
}

export function MessageErreur({ children }: { children: ReactNode }) {
  if (!children) return null;
  return <p role="alert" className="rounded-xl bg-rouge-pale px-3 py-2 text-sm text-rouge">{children}</p>;
}

export function MessageSucces({ children }: { children: ReactNode }) {
  if (!children) return null;
  return <p role="status" className="rounded-xl bg-vert-pale px-3 py-2 text-sm text-vert">{children}</p>;
}

export function Chargement({ texte = "Chargement…" }: { texte?: string }) {
  return <p className="py-16 text-center text-sm text-doux">{texte}</p>;
}

// Case à cocher ronde (tâches)
export function CaseRonde({ coche, onClick, libelle, disabled }: { coche: boolean; onClick: () => void; libelle: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={coche}
      aria-label={libelle}
      disabled={disabled}
      onClick={onClick}
      className={`flex size-7 shrink-0 items-center justify-center rounded-lg border-[1.5px] text-sm font-bold ${
        coche ? "border-vert bg-vert text-white" : "border-[#B9A999] bg-white"
      }`}
    >
      {coche ? "✓" : ""}
    </button>
  );
}

// Icônes au trait fin (pas d'emoji)
const trait = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
export const Icones = {
  accueil: (c = "size-6") => <svg viewBox="0 0 24 24" className={c} aria-hidden {...trait}><path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z" /></svg>,
  planning: (c = "size-6") => <svg viewBox="0 0 24 24" className={c} aria-hidden {...trait}><path d="M9 6h11M9 12h11M9 18h11" /><path d="M4 6l1 1 2-2M4 12l1 1 2-2M4 18h3" /></svg>,
  budget: (c = "size-6") => <svg viewBox="0 0 24 24" className={c} aria-hidden {...trait}><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18M16 15h2" /></svg>,
  documents: (c = "size-6") => <svg viewBox="0 0 24 24" className={c} aria-hidden {...trait}><path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" /><path d="M14 3v5h5M9 13h6M9 17h6" /></svg>,
  album: (c = "size-6") => <svg viewBox="0 0 24 24" className={c} aria-hidden {...trait}><rect x="3" y="5" width="18" height="15" rx="2" /><circle cx="9" cy="10" r="1.8" /><path d="M21 16l-5-5-8 8" /></svg>,
  cloche: (c = "size-5") => <svg viewBox="0 0 24 24" className={c} aria-hidden {...trait}><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>,
  aFaire: (c = "size-6") => <svg viewBox="0 0 24 24" className={c} aria-hidden {...trait}><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M8 12l3 3 5-6" /></svg>,
  rdv: (c = "size-6") => <svg viewBox="0 0 24 24" className={c} aria-hidden {...trait}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>,
  deroule: (c = "size-6") => <svg viewBox="0 0 24 24" className={c} aria-hidden {...trait}><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3 2" /></svg>,
  paiements: (c = "size-6") => <svg viewBox="0 0 24 24" className={c} aria-hidden {...trait}><path d="M4 7h16v11H4z" /><path d="M8 12h.01M12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" /></svg>,
  questionnaire: (c = "size-6") => <svg viewBox="0 0 24 24" className={c} aria-hidden {...trait}><path d="M4 5h11v8H8l-4 3z" /><path d="M15 9h5v8l-3-2h-6v-2" /></svg>,
  prestataires: (c = "size-6") => <svg viewBox="0 0 24 24" className={c} aria-hidden {...trait}><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M3 12h18" /></svg>,
  proches: (c = "size-6") => <svg viewBox="0 0 24 24" className={c} aria-hidden {...trait}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c1-3.5 3.5-5.5 6.5-5.5s5.5 2 6.5 5.5" /><circle cx="17" cy="9" r="2.5" /><path d="M16 14.5c2.5 0 4.5 1.5 5.5 4.5" /></svg>,
  reglages: (c = "size-6") => <svg viewBox="0 0 24 24" className={c} aria-hidden {...trait}><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" /></svg>,
  plus: (c = "size-5") => <svg viewBox="0 0 24 24" className={c} aria-hidden {...trait}><path d="M12 5v14M5 12h14" /></svg>,
  appareil: (c = "size-7") => <svg viewBox="0 0 24 24" className={c} aria-hidden {...trait} strokeWidth={1.6}><rect x="3" y="6" width="18" height="14" rx="3" /><circle cx="12" cy="13" r="3.5" /><path d="M8 6l1.5-2h5L16 6" /></svg>,
  enveloppe: (c = "size-9") => <svg viewBox="0 0 24 24" className={c} aria-hidden {...trait} strokeWidth={1.6}><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="M3.5 6.5L12 13l8.5-6.5" /></svg>,
  coeur: (c = "size-6") => <svg viewBox="0 0 24 24" className={c} aria-hidden {...trait}><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" /></svg>,
  couples: (c = "size-6") => <svg viewBox="0 0 24 24" className={c} aria-hidden {...trait}><circle cx="8.5" cy="9" r="3" /><circle cx="15.5" cy="9" r="3" /><path d="M3 20c.8-3 3-4.5 5.5-4.5S13 17 14 20M10 20c1-3 3.2-4.5 5.5-4.5S20.2 17 21 20" /></svg>,
  modeles: (c = "size-6") => <svg viewBox="0 0 24 24" className={c} aria-hidden {...trait}><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></svg>,
  sortie: (c = "size-5") => <svg viewBox="0 0 24 24" className={c} aria-hidden {...trait}><path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" /></svg>,
};
