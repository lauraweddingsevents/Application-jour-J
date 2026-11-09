import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { VueIntervenant } from "./VueIntervenant";

export const metadata: Metadata = {
  title: "Mon déroulé du jour J",
  // Les liens personnels ne doivent pas apparaître dans les moteurs de recherche
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export const viewport: Viewport = { themeColor: "#F4EDE4" };

export default function PageLien() {
  return (
    <Suspense fallback={<p className="mt-20 text-center text-encre-doux">Chargement…</p>}>
      <VueIntervenant />
    </Suspense>
  );
}
