import type { Metadata } from "next";
import { Suspense } from "react";
import { Coquille } from "@/components/Coquille";
import { FicheDemande } from "./FicheDemande";

export const metadata: Metadata = { title: "Demande" };

export default async function PageDemande({ params }: PageProps<"/demande/[id]">) {
  const { id } = await params;
  return (
    <Coquille>
      <Suspense fallback={<p className="text-encre-doux">Chargement…</p>}>
        <FicheDemande id={id} />
      </Suspense>
    </Coquille>
  );
}
