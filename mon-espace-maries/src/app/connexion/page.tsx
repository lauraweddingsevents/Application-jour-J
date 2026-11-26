import type { Metadata } from "next";
import { FormulaireConnexion } from "./FormulaireConnexion";

export const metadata: Metadata = { title: "Connexion" };

export default function PageConnexion() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 pb-7 pt-5">
      <FormulaireConnexion />
    </main>
  );
}
