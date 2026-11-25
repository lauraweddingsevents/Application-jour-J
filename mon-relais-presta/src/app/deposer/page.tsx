import type { Metadata } from "next";
import { Suspense } from "react";
import { Coquille } from "@/components/Coquille";
import { FormulaireDemande } from "./FormulaireDemande";

export const metadata: Metadata = { title: "Déposer une demande" };

export default function PageDeposer() {
  return (
    <Coquille>
      <Suspense fallback={<p className="text-encre-doux">Chargement…</p>}>
        <FormulaireDemande />
      </Suspense>
    </Coquille>
  );
}
