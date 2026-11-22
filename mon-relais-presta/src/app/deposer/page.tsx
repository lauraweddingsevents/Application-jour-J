import type { Metadata } from "next";
import { Coquille } from "@/components/Coquille";
import { Carte } from "@/components/ui/Carte";

export const metadata: Metadata = { title: "Déposer une demande" };

// Page construite à l'étape 2
export default function Page() {
  return (
    <Coquille>
      <h1 className="text-2xl font-light">Déposer une demande</h1>
      <Carte className="mt-5 text-encre-doux">Bientôt disponible.</Carte>
    </Coquille>
  );
}
