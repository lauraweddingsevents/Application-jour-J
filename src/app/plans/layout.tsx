import type { Metadata } from "next";
import type { ReactNode } from "react";

// Pages « Mon plan de salle » : nom et icône propres sur l'écran d'accueil
export const metadata: Metadata = {
  manifest: "/plans/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Plan de salle", statusBarStyle: "default" },
};

export default function Disposition({ children }: { children: ReactNode }) {
  return children;
}
