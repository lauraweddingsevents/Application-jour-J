// Vue du plan de salle dans le lien d'un intervenant (même règle que la
// fonction vue_plan_auto de la base).
import type { Categorie } from "@/lib/types";

export type VuePlan = "coordination" | "traiteur" | "loueur" | "decoration" | "simple" | "aucune";

export const VUES_PLAN: { valeur: VuePlan; texte: string; detail: string }[] = [
  { valeur: "traiteur", texte: "Traiteur", detail: "Plan, numéros de tables, couverts et menus particuliers (sans les noms)" },
  { valeur: "loueur", texte: "Loueur / lieu", detail: "Plan et récapitulatif du matériel (tables, chaises, zones)" },
  { valeur: "decoration", texte: "Décoration", detail: "Plan, zones et notes de décoration" },
  { valeur: "coordination", texte: "Coordination", detail: "Tout, y compris le nom des invités à chaque table" },
  { valeur: "simple", texte: "Plan seul", detail: "Le plan et les noms des tables, sans les invités" },
  { valeur: "aucune", texte: "Pas de plan", detail: "Le plan n'apparaît pas dans son lien" },
];

export function vuePlanAuto(role: string | null, categorie: Categorie, coordination: boolean): VuePlan {
  const r = role ?? "";
  if (coordination || /wedding|coordinat|organisat/i.test(r)) return "coordination";
  if (/traiteur|p[âa]tissi|barman|cuisin|chef|serveur|maître d|maitre d/i.test(r)) return "traiteur";
  if (/loueur|location|mobilier|lieu/i.test(r)) return "loueur";
  if (/d[ée]cor|fleur|sc[ée]no/i.test(r)) return "decoration";
  if (categorie === "proche") return "aucune";
  return "simple";
}

export const texteVue = (v: VuePlan) => VUES_PLAN.find((x) => x.valeur === v)?.texte ?? v;
