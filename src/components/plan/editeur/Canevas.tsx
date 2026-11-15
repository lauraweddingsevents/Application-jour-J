"use client";
// Zone de dessin de l'éditeur : déplacer la vue au doigt, zoomer (pincement,
// molette, boutons), toucher un élément pour le choisir, le glisser pour le
// déplacer (pas de 5 cm). Repris du prototype.
import { useCallback, useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import { DessinElement, DessinSalle, ordreAffichage } from "@/components/plan/DessinPlan";
import type { Element, PlanContenu } from "@/plan/types";

const PAS = 5; // les éléments se placent au multiple de 5 cm
const caler = (v: number) => Math.round(v / PAS) * PAS;

type Vue = { x: number; y: number; w: number; h: number };

export type CanevasPoignee = { centre: () => { x: number; y: number }; recadrer: () => void; svg: () => SVGSVGElement | null };

export function Canevas({
  contenu,
  enDefaut,
  selection,
  peutDeplacer,
  onChoisir,
  onDebutDeplacement,
  onDeplacer,
  onFinDeplacement,
  poignee,
}: {
  contenu: PlanContenu;
  enDefaut: Set<string>;
  selection: string | null;
  peutDeplacer: (e: Element) => boolean;
  onChoisir: (id: string | null) => void;
  onDebutDeplacement: () => void;
  onDeplacer: (id: string, x: number, y: number) => void;
  onFinDeplacement: (aBouge: boolean) => void;
  poignee?: Ref<CanevasPoignee>;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const { w: W, h: H } = contenu.room;

  const cadrage = useCallback((): Vue => {
    const m = Math.max(W, H) * 0.08 + 60;
    return { x: -m, y: -m, w: W + 2 * m, h: H + 2.4 * m };
  }, [W, H]);
  const [vue, setVue] = useState<Vue>(cadrage);
  const vueRef = useRef(vue);
  useEffect(() => {
    vueRef.current = vue;
  }, [vue]);

  // Nouvelle taille de salle : on recadre
  useEffect(() => {
    // Recadrage quand les dimensions de la salle changent
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVue(cadrage());
  }, [cadrage]);

  useImperativeHandle(poignee, () => ({
    centre: () => {
      const v = vueRef.current;
      return {
        x: Math.min(W - 150, Math.max(150, v.x + v.w / 2)),
        y: Math.min(H - 150, Math.max(150, v.y + v.h / 2)),
      };
    },
    recadrer: () => setVue(cadrage()),
    svg: () => svgRef.current,
  }));

  const borner = (w: number) => Math.min(Math.max(W, H) * 3, Math.max(150, w));
  const zoomer = (v: Vue, centre: { x: number; y: number }, f: number): Vue => {
    const w = borner(v.w * f);
    const k = w / v.w;
    return { x: centre.x - (centre.x - v.x) * k, y: centre.y - (centre.y - v.y) * k, w: v.w * k, h: v.h * k };
  };
  const versSvg = (clientX: number, clientY: number) => {
    const svg = svgRef.current!;
    const p = svg.createSVGPoint();
    p.x = clientX;
    p.y = clientY;
    return p.matrixTransform(svg.getScreenCTM()!.inverse());
  };

  // Gestes en cours
  const doigts = useRef(new Map<number, { x: number; y: number }>());
  const geste = useRef<
    | { mode: "element"; id: string; dx: number; dy: number; bouge: boolean; deplacable: boolean }
    | { mode: "vue"; sx: number; sy: number; v: Vue; k: number; bouge: boolean }
    | null
  >(null);
  const pincement = useRef<{ d: number; v: Vue; m: { x: number; y: number } } | null>(null);

  function terminerGeste() {
    const g = geste.current;
    if (g?.mode === "element" && g.deplacable) onFinDeplacement(g.bouge);
    if (g?.mode === "vue" && !g.bouge) onChoisir(null);
    geste.current = null;
  }

  function surAppui(ev: React.PointerEvent<SVGSVGElement>) {
    svgRef.current!.setPointerCapture(ev.pointerId);
    doigts.current.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (doigts.current.size === 2) {
      if (geste.current?.mode === "element" && geste.current.deplacable) onFinDeplacement(geste.current.bouge);
      geste.current = null;
      const [a, b] = [...doigts.current.values()];
      pincement.current = { d: Math.hypot(a.x - b.x, a.y - b.y), v: vueRef.current, m: versSvg((a.x + b.x) / 2, (a.y + b.y) / 2) };
      return;
    }
    const cible = (ev.target as Element & globalThis.Element).closest?.("[data-id]") as HTMLElement | null;
    const p = versSvg(ev.clientX, ev.clientY);
    if (cible) {
      const el = contenu.items.find((i) => i.id === cible.dataset.id);
      if (!el) return;
      onChoisir(el.id);
      const deplacable = peutDeplacer(el);
      if (deplacable) onDebutDeplacement();
      geste.current = { mode: "element", id: el.id, dx: p.x - el.x, dy: p.y - el.y, bouge: false, deplacable };
    } else {
      geste.current = { mode: "vue", sx: ev.clientX, sy: ev.clientY, v: vueRef.current, k: svgRef.current!.getScreenCTM()!.a, bouge: false };
    }
  }

  function surMouvement(ev: React.PointerEvent<SVGSVGElement>) {
    if (!doigts.current.has(ev.pointerId)) return;
    doigts.current.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    const pc = pincement.current;
    if (pc && doigts.current.size === 2) {
      const [a, b] = [...doigts.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      setVue(zoomer(pc.v, pc.m, pc.d / d));
      return;
    }
    const g = geste.current;
    if (!g) return;
    if (g.mode === "element") {
      if (!g.deplacable) return;
      const p = versSvg(ev.clientX, ev.clientY);
      const el = contenu.items.find((i) => i.id === g.id);
      const nx = caler(p.x - g.dx);
      const ny = caler(p.y - g.dy);
      if (el && (nx !== el.x || ny !== el.y)) {
        g.bouge = true;
        onDeplacer(g.id, nx, ny);
      }
    } else {
      const dx = ev.clientX - g.sx;
      const dy = ev.clientY - g.sy;
      if (Math.abs(dx) + Math.abs(dy) > 4) g.bouge = true;
      setVue({ ...g.v, x: g.v.x - dx / g.k, y: g.v.y - dy / g.k });
    }
  }

  function surRelache(ev: React.PointerEvent<SVGSVGElement>) {
    doigts.current.delete(ev.pointerId);
    if (doigts.current.size < 2) pincement.current = null;
    if (doigts.current.size === 0) terminerGeste();
  }

  // Molette (ordinateur) : zoom autour du pointeur
  useEffect(() => {
    const svg = svgRef.current!;
    const molette = (ev: WheelEvent) => {
      ev.preventDefault();
      const p = versSvg(ev.clientX, ev.clientY);
      setVue((v) => zoomer(v, p, ev.deltaY > 0 ? 1.12 : 0.89));
    };
    svg.addEventListener("wheel", molette, { passive: false });
    return () => svg.removeEventListener("wheel", molette);
  });

  const zoomBouton = (f: number) => setVue((v) => zoomer(v, { x: v.x + v.w / 2, y: v.y + v.h / 2 }, f));

  return (
    <div className="relative h-full w-full">
      <svg
        ref={svgRef}
        viewBox={`${vue.x} ${vue.y} ${vue.w} ${vue.h}`}
        preserveAspectRatio="xMidYMid meet"
        className="block h-full w-full touch-none select-none"
        fontFamily="Poppins, system-ui, sans-serif"
        onPointerDown={surAppui}
        onPointerMove={surMouvement}
        onPointerUp={surRelache}
        onPointerCancel={surRelache}
        role="application"
        aria-label="Plan de salle : glissez les éléments pour les déplacer"
      >
        <DessinSalle plan={contenu} taillePolice={Math.max(vue.w / 48, 14)} />
        {ordreAffichage(contenu.items).map((e) => (
          <DessinElement key={e.id} e={e} defaut={enDefaut.has(e.id)} selectionne={e.id === selection} />
        ))}
      </svg>
      <div className="absolute right-2.5 top-2.5 flex flex-col gap-1.5">
        {[
          ["+", "Zoomer", () => zoomBouton(0.75)],
          ["−", "Dézoomer", () => zoomBouton(1.33)],
          ["⤢", "Voir toute la salle", () => setVue(cadrage())],
        ].map(([t, l, f]) => (
          <button
            key={l as string}
            type="button"
            aria-label={l as string}
            onClick={f as () => void}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-blanc text-lg shadow-sm ring-1 ring-or-clair"
          >
            {t as string}
          </button>
        ))}
      </div>
    </div>
  );
}
