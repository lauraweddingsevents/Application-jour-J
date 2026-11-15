import type { Metadata } from "next";
import { Suspense } from "react";
import { ImpressionPlan } from "./ImpressionPlan";

export const metadata: Metadata = { title: { absolute: "Version imprimable · Mon plan de salle" } };

export default function Page() {
  return (
    <Suspense fallback={<p className="mt-20 text-center text-encre-doux">Chargement…</p>}>
      <ImpressionPlan />
    </Suspense>
  );
}
