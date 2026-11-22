import type { Metadata } from "next";
import { Coquille } from "@/components/Coquille";
import { Carte } from "@/components/ui/Carte";

export const metadata: Metadata = { title: "Demandes" };

// Page construite à l'étape 2
export default function Page() {
  return (
    <Coquille>
      <h1 className="text-2xl font-light">Demandes</h1>
      <Carte className="mt-5 text-encre-doux">Bientôt disponible.</Carte>
    </Coquille>
  );
}
