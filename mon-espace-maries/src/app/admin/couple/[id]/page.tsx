import { Suspense } from "react";
import { Chargement } from "@/components/ui";
import { FicheCouple } from "./FicheCouple";

export default function PageFicheCouple() {
  return (
    <Suspense fallback={<Chargement />}>
      <FicheCouple />
    </Suspense>
  );
}
