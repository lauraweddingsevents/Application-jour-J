// Dessin d'un plan de salle à l'échelle (SVG), repris du prototype.
// Utilisé pour l'aperçu, et plus tard par l'éditeur et les liens prestataires.
import type { ReactNode } from "react";
import { estTable, places } from "@/plan/moteur";
import type { Element, PlanContenu } from "@/plan/types";

const COULEURS = {
  table: "#f3e7da",
  trait: "#b08a6e",
  chaise: "#cdb8a4",
  defaut: "#c0392b",
  encre: "#3b3029",
  doux: "#8a7b6f",
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

export function DessinElement({ e, defaut = false, selectionne = false }: { e: Element; defaut?: boolean; selectionne?: boolean }) {
  const trait = defaut ? COULEURS.defaut : COULEURS.trait;
  const epaisseur = defaut ? 6 : 4;
  const formes: ReactNode[] = [];
  let taille = 100;

  if (e.type === "round") {
    const R = e.d / 2 + 26;
    for (let i = 0; i < e.chairs; i++) {
      const a = (2 * Math.PI * i) / e.chairs - Math.PI / 2;
      formes.push(<Chaise key={`c${i}`} x={R * Math.cos(a)} y={R * Math.sin(a)} angle={(a * 180) / Math.PI + 90} defaut={defaut} />);
    }
    formes.push(<circle key="t" cx={0} cy={0} r={e.d / 2} fill={COULEURS.table} stroke={trait} strokeWidth={epaisseur} />);
    taille = e.d;
  } else if (e.type === "rect") {
    for (let i = 0; i < e.sides; i++) {
      const x = -e.L / 2 + (e.L * (i + 0.5)) / e.sides;
      formes.push(<Chaise key={`h${i}`} x={x} y={-(e.W / 2 + 26)} angle={0} defaut={defaut} />);
      formes.push(<Chaise key={`b${i}`} x={x} y={e.W / 2 + 26} angle={180} defaut={defaut} />);
    }
    for (let i = 0; i < e.ends; i++) {
      const y = -e.W / 2 + (e.W * (i + 0.5)) / e.ends;
      formes.push(<Chaise key={`g${i}`} x={-(e.L / 2 + 26)} y={y} angle={-90} defaut={defaut} />);
      formes.push(<Chaise key={`d${i}`} x={e.L / 2 + 26} y={y} angle={90} defaut={defaut} />);
    }
    formes.push(<rect key="t" x={-e.L / 2} y={-e.W / 2} width={e.L} height={e.W} rx={6} fill={COULEURS.table} stroke={trait} strokeWidth={epaisseur} />);
    taille = Math.min(e.L * 0.8, e.W * 2.2);
  } else if (e.type === "pillar") {
    const attrs = { fill: "#6f625a", stroke: defaut ? COULEURS.defaut : COULEURS.encre, strokeWidth: defaut ? 6 : 3 };
    formes.push(
      e.shape === "round" ? (
        <circle key="p" cx={0} cy={0} r={e.L / 2} {...attrs} />
      ) : (
        <rect key="p" x={-e.L / 2} y={-e.L / 2} width={e.L} height={e.L} {...attrs} />
      ),
    );
  } else {
    formes.push(
      <rect key="z" x={-e.L / 2} y={-e.W / 2} width={e.L} height={e.W} rx={10}
        fill="rgba(176,138,110,.13)" stroke={trait} strokeWidth={4} strokeDasharray="16 10" />,
    );
    taille = Math.min(e.L, e.W) * 1.1;
  }

  const fs = Math.max(14, Math.min(taille * 0.2, 46));
  const n = places(e);
  const g = e.guests.length;
  return (
    <g data-id={e.id}>
      <g transform={`translate(${e.x} ${e.y}) rotate(${e.rot})`}>
        {formes}
        {selectionne && e.type !== "pillar" && (
          <rect
            x={-(e.type === "round" ? e.d / 2 + 60 : e.L / 2 + 10)} y={-(e.type === "round" ? e.d / 2 + 60 : e.W / 2 + 10)}
            width={e.type === "round" ? e.d + 120 : e.L + 20} height={e.type === "round" ? e.d + 120 : e.W + 20}
            fill="none" stroke="#8f6b52" strokeWidth={3} strokeDasharray="12 8" rx={12}
          />
        )}
      </g>
      {e.type !== "pillar" && (
        estTable(e) ? (
          <>
            <text x={e.x} y={e.y - fs * 0.45} fontSize={fs} fontWeight={600} textAnchor="middle" dominantBaseline="middle" fill={COULEURS.encre}>
              {e.name}
            </text>
            <text x={e.x} y={e.y + fs * 0.6} fontSize={fs * 0.72} textAnchor="middle" dominantBaseline="middle" fill={g > n ? COULEURS.defaut : COULEURS.doux}>
              {g ? `${g}/${n}` : `${n} pl.`}
            </text>
          </>
        ) : (
          <text x={e.x} y={e.y} fontSize={fs} fontWeight={600} textAnchor="middle" dominantBaseline="middle" fill="#8f6b52">
            {e.name}
          </text>
        )
      )}
    </g>
  );
}

// La salle (fond, quadrillage tous les mètres, murs) et ses éléments
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
  const lignes: ReactNode[] = [];
  for (let x = 100; x < W; x += 100) lignes.push(<line key={`x${x}`} x1={x} y1={0} x2={x} y2={H} stroke={x % 500 ? "#f2ebe3" : "#e6dbcf"} />);
  for (let y = 100; y < H; y += 100) lignes.push(<line key={`y${y}`} x1={0} y1={y} x2={W} y2={y} stroke={y % 500 ? "#f2ebe3" : "#e6dbcf"} />);
  const ordre = [
    ...plan.items.filter((i) => i.type === "zone"),
    ...plan.items.filter((i) => i.type === "pillar"),
    ...plan.items.filter(estTable),
  ];
  const lab = Math.max(W, H) / 40;
  return (
    <svg
      viewBox={`${-marge} ${-marge} ${W + 2 * marge} ${H + 2 * marge}`}
      className={className}
      fontFamily="Poppins, system-ui, sans-serif"
      role="img"
      aria-label={`Plan de salle ${plan.name}`}
    >
      <rect x={0} y={0} width={W} height={H} fill="#fffdf9" />
      <g strokeWidth={1.5}>{lignes}</g>
      <rect x={0} y={0} width={W} height={H} fill="none" stroke={COULEURS.encre} strokeWidth={8} />
      {cotes && (
        <>
          <text x={W / 2} y={-lab * 0.9} fontSize={lab} textAnchor="middle" fill={COULEURS.doux}>
            {(W / 100).toLocaleString("fr-FR")} m
          </text>
          <text x={-lab * 0.9} y={H / 2} fontSize={lab} textAnchor="middle" fill={COULEURS.doux} transform={`rotate(-90 ${-lab * 0.9} ${H / 2})`}>
            {(H / 100).toLocaleString("fr-FR")} m
          </text>
        </>
      )}
      {ordre.map((e) => (
        <DessinElement key={e.id} e={e} defaut={enDefaut?.has(e.id)} />
      ))}
    </svg>
  );
}
