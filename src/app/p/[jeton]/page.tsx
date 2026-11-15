import type { Metadata } from "next";
import { Suspense } from "react";
import { LienPlan } from "./LienPlan";

export const metadata: Metadata = {
  title: { absolute: "Plan de salle partagé · Mon plan de salle" },
  robots: { index: false, follow: false },
  referrer: "no-referrer",
  manifest: "/plans/manifest.webmanifest",
};

export default function Page() {
  return (
    <Suspense fallback={<p className="mt-20 text-center text-encre-doux">Chargement…</p>}>
      <LienPlan />
    </Suspense>
  );
}
