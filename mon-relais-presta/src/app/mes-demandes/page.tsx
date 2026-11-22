import type { Metadata } from "next";
import { Coquille } from "@/components/Coquille";
import { Carte } from "@/components/ui/Carte";

export const metadata: Metadata = { title: "Mes suivis" };

// Page construite à l'étape 2
export default function Page() {
  return (
    <Coquille>
      <h1 className="text-2xl font-light">Mes suivis</h1>
      <Carte className="mt-5 text-encre-doux">Bientôt disponible.</Carte>
    </Coquille>
  );
}
