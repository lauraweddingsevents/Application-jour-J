import type { Metadata } from "next";
import { Suspense } from "react";
import { PagePlan } from "./PagePlan";

export const metadata: Metadata = { title: { absolute: "Plan · Mon plan de salle" } };

export default function Page() {
  return (
    <Suspense fallback={<p className="mt-20 text-center text-encre-doux">Chargement…</p>}>
      <PagePlan />
    </Suspense>
  );
}
