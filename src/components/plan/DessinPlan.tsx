// Dessin d'un plan de salle à l'échelle (SVG), repris du prototype et enrichi
// (portes, fenêtres, estrade, salle en L). Utilisé par l'aperçu, l'éditeur
// et, plus tard, les liens prestataires.
import type { ReactNode } from "react";
import { contour, estTable, places } from "@/plan/moteur";
import { contourSalle } from "@/plan/salle";
import type { Element, PlanContenu } from "@/plan/types";

export const COULEURS = {
  table: "#f3e7da",
  trait: "#b08a6e",
  chaise: "#cdb8a4",
  defaut: "#c0392b",
  encre: "#3b3029",
  doux: "#8a7b6f",
  selection: "#8f6b52",
};

function Chaise({ x, y, angle, defaut }: { x: number; y: number; angle: number; defaut: boolean }) {
  return (
    <rect
      x={-20} y={-19} width={40} height={38} rx={9}
      fill="#fff" stroke={defaut ? "#e2a59d" : COULEURS.chaise} strokeWidth={3}
      transform={`translate(${x} ${y}) rotate(${angle})`}
    />
  );
}

function formes(e: Element, defaut: boolean): { formes: ReactNode[]; taille: number } {
  const trait = defaut ? COULEURS.defaut : COULEURS.trait;
  const ep = defaut ? 6 : 4;
  const f: ReactNode[] = [];
  switch (e.type) {
    case "round": {
      const R = e.d / 2 + 26;
      for (let i = 0; i < e.chairs; i++) {
        const a = (2 * Math.PI * i) / e.chairs - Math.PI / 2;
        f.push(<Chaise key={`c${i}`} x={R * Math.cos(a)} y={R * Math.sin(a)} angle={(a * 180) / Math.PI + 90} defaut={defaut} />);
      }
      f.push(<circle key="t" cx={0} cy={0} r={e.d / 2} fill={COULEURS.table} stroke={trait} strokeWidth={ep} />);
      return { formes: f, taille: e.d };
    }
    case "rect": {
      for (let i = 0; i < e.sides; i++) {
        const x = -e.L / 2 + (e.L * (i + 0.5)) / e.sides;
        f.push(<Chaise key={`h${i}`} x={x} y={-(e.W / 2 + 26)} angle={0} defaut={defaut} />);
        f.push(<Chaise key={`b${i}`} x={x} y={e.W / 2 + 26} angle={180} defaut={defaut} />);
      }
      for (let i = 0; i < e.ends; i++) {
        const y = -e.W / 2 + (e.W * (i + 0.5)) / e.ends;
        f.push(<Chaise key={`g${i}`} x={-(e.L / 2 + 26)} y={y} angle={-90} defaut={defaut} />);
        f.push(<Chaise key={`d${i}`} x={e.L / 2 + 26} y={y} angle={90} defaut={defaut} />);
      }
      f.push(<rect key="t" x={-e.L / 2} y={-e.W / 2} width={e.L} height={e.W} rx={6} fill={COULEURS.table} stroke={trait} strokeWidth={ep} />);
      return { formes: f, taille: Math.min(e.L * 0.8, e.W * 2.2) };
    }
    case "pillar": {
      const a = { fill: "#6f625a", stroke: defaut ? COULEURS.defaut : COULEURS.encre, strokeWidth: defaut ? 6 : 3 };
      f.push(e.shape === "round" ? <circle key="p" cx={0} cy={0} r={e.L / 2} {...a} /> : <rect key="p" x={-e.L / 2} y={-e.L / 2} width={e.L} height={e.L} {...a} />);
      return { formes: f, taille: 0 };
    }
    case "estrade":
      f.push(<rect key="e" x={-e.L / 2} y={-e.W / 2} width={e.L} height={e.W} rx={4} fill="#e6d6c3" stroke={trait} strokeWidth={ep} />);
      f.push(<rect key="e2" x={-e.L / 2 + 14} y={-e.W / 2 + 14} width={Math.max(0, e.L - 28)} height={Math.max(0, e.W - 28)} rx={2} fill="none" stroke="#cdb8a4" strokeWidth={2} />);
      return { formes: f, taille: Math.min(e.L, e.W) * 1.1 };
    case "porte": {
      // Ouverture dans le mur + battant et arc d'ouverture vers l'intérieur
      const g = e.sens === "gauche" ? -1 : 1;
      const pivot = -g * (e.L / 2);
      f.push(<line key="m" x1={-e.L / 2} y1={0} x2={e.L / 2} y2={0} stroke="#fffdf9" strokeWidth={14} />);
      f.push(<line key="b" x1={pivot} y1={0} x2={pivot} y2={e.L} stroke={trait} strokeWidth={5} />);
      f.push(
        <path key="a" d={`M ${pivot} ${e.L} A ${e.L} ${e.L} 0 0 ${g > 0 ? 0 : 1} ${pivot + g * e.L} 0`} fill="rgba(176,138,110,.08)" stroke={trait} strokeWidth={2.5} strokeDasharray="8 6" />,
      );
      return { formes: f, taille: 0 };
    }
    case "fenetre":
      f.push(<rect key="f" x={-e.L / 2} y={-8} width={e.L} height={16} fill="#fffdf9" stroke={trait} strokeWidth={3} />);
      f.push(<line key="f2" x1={-e.L / 2} y1={0} x2={e.L / 2} y2={0} stroke={trait} strokeWidth={2} />);
      return { formes: f, taille: 0 };
    case "zone":
    default: {
      const z = e as Extract<Element, { type: "zone" }>;
      f.push(<rect key="z" x={-z.L / 2} y={-z.W / 2} width={z.L} height={z.W} rx={10} fill="rgba(176,138,110,.13)" stroke={trait} strokeWidth={4} strokeDasharray="16 10" />);
      return { formes: f, taille: Math.min(z.L, z.W) * 1.1 };
    }
  }
}

export function DessinElement({
  e,
  defaut = false,
  selectionne = false,
  numeros = true,
}: {
  e: Element;
  defaut?: boolean;
  selectionne?: boolean;
  numeros?: boolean;
}) {
  const { formes: f, taille } = formes(e, defaut);
  const fs = Math.max(14, Math.min(taille * 0.2, 46));
  const n = places(e);
  const g = e.guests.length;
  const avecNom = taille > 0;
  return (
    <g data-id={e.id} style={{ cursor: e.verrou ? "default" : "grab" }}>
      {selectionne && (
        <polygon
          points={contour(e).map((p) => p.join(",")).join(" ")}
          fill="rgba(176,138,110,.08)" stroke={COULEURS.selection} strokeWidth={3} strokeDasharray="12 8"
        />
      )}
      <g transform={`translate(${e.x} ${e.y}) rotate(${e.rot})`}>{f}</g>
      {avecNom &&
        (estTable(e) ? (
          <>
            <text x={e.x} y={e.y - fs * 0.45} fontSize={fs} fontWeight={600} textAnchor="middle" dominantBaseline="middle" fill={COULEURS.encre}>
              {e.name}
            </text>
            {numeros && (
              <text x={e.x} y={e.y + fs * 0.6} fontSize={fs * 0.72} textAnchor="middle" dominantBaseline="middle" fill={g > n ? COULEURS.defaut : COULEURS.doux}>
                {g ? `${g}/${n}` : `${n} pl.`}
              </text>
            )}
          </>
        ) : (
          <text x={e.x} y={e.y} fontSize={fs} fontWeight={600} textAnchor="middle" dominantBaseline="middle" fill={COULEURS.selection}>
            {e.name}
          </text>
        ))}
      {e.verrou && (
        <text x={e.x} y={e.y - Math.max(fs * 1.4, 30)} fontSize={24} textAnchor="middle" dominantBaseline="middle">
          🔒
        </text>
      )}
    </g>
  );
}

// Fond de salle (contour, quadrillage tous les mètres, murs) sans les éléments
export function DessinSalle({ plan, cotes = true, taillePolice }: { plan: PlanContenu; cotes?: boolean; taillePolice?: number }) {
  const { w: W, h: H } = plan.room;
  const pts = contourSalle(plan.room);
  const chemin = pts.map((p) => p.join(",")).join(" ");
  const idClip = `salle-${plan.room.w}-${plan.room.h}-${pts.length}`;
  const lignes: ReactNode[] = [];
  for (let x = 100; x < W; x += 100) lignes.push(<line key={`x${x}`} x1={x} y1={0} x2={x} y2={H} stroke={x % 500 ? "#f2ebe3" : "#e6dbcf"} />);
  for (let y = 100; y < H; y += 100) lignes.push(<line key={`y${y}`} x1={0} y1={y} x2={W} y2={y} stroke={y % 500 ? "#f2ebe3" : "#e6dbcf"} />);
  const lab = taillePolice ?? Math.max(W, H) / 40;
  return (
    <>
      <defs>
        <clipPath id={idClip}>
          <polygon points={chemin} />
        </clipPath>
      </defs>
      <polygon points={chemin} fill="#fffdf9" />
      <g strokeWidth={1.5} clipPath={`url(#${idClip})`}>{lignes}</g>
      <polygon points={chemin} fill="none" stroke={COULEURS.encre} strokeWidth={8} strokeLinejoin="miter" />
      {cotes && (
        <>
          <text x={W / 2} y={-lab * 0.9} fontSize={lab} textAnchor="middle" fill={COULEURS.doux}>
            {(W / 100).toLocaleString("fr-FR")} m
          </text>
          <text x={-lab * 0.9} y={H / 2} fontSize={lab} textAnchor="middle" fill={COULEURS.doux} transform={`rotate(-90 ${-lab * 0.9} ${H / 2})`}>
            {(H / 100).toLocaleString("fr-FR")} m
          </text>
          <line x1={0} y1={H + lab * 1.4} x2={100} y2={H + lab * 1.4} stroke={COULEURS.doux} strokeWidth={4} />
          <text x={50} y={H + lab * 2.3} fontSize={lab * 0.8} textAnchor="middle" fill={COULEURS.doux}>
            1 m
          </text>
        </>
      )}
    </>
  );
}

// Ordre d'affichage : zones et estrades dessous, puis murs, poteaux, tables
export function ordreAffichage(items: Element[]) {
  const rang: Record<Element["type"], number> = { zone: 0, estrade: 1, fenetre: 2, porte: 3, pillar: 4, round: 5, rect: 5 };
  return [...items].sort((a, b) => rang[a.type] - rang[b.type]);
}

// Plan complet, non modifiable (aperçus, miniatures, liens prestataires)
export function DessinPlan({
  plan,
  enDefaut,
  className,
  cotes = true,
}: {
  plan: PlanContenu;
  enDefaut?: Set<string>;
  className?: string;
  cotes?: boolean;
}) {
  const { w: W, h: H } = plan.room;
  const marge = Math.max(W, H) * 0.06 + 40;
  return (
    <svg
      viewBox={`${-marge} ${-marge} ${W + 2 * marge} ${H + 2 * marge + (cotes ? marge * 0.6 : 0)}`}
      className={className}
      fontFamily="Poppins, system-ui, sans-serif"
      role="img"
      aria-label={`Plan de salle ${plan.name}`}
    >
      <DessinSalle plan={plan} cotes={cotes} />
      {ordreAffichage(plan.items).map((e) => (
        <DessinElement key={e.id} e={e} defaut={enDefaut?.has(e.id)} />
      ))}
    </svg>
  );
}
