import type { Metadata } from "next";
import Link from "next/link";
import { FormulaireConnexion } from "@/app/connexion/FormulaireConnexion";
import { LogoPlan } from "@/components/plan/LogoPlan";

export const metadata: Metadata = { title: { absolute: "Connexion · Mon plan de salle" } };

export default function ConnexionPlan() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-14">
      <Link href="/plan-de-salle" className="self-center">
        <LogoPlan taille="grand" />
      </Link>
      <h1 className="mt-10 text-center text-xl font-medium">Accéder à mes plans</h1>
      <p className="mt-2 text-center text-encre-doux">Par un lien reçu par e-mail, ou avec votre mot de passe.</p>
      <FormulaireConnexion suiteParDefaut="/plans" />
      <p className="mt-8 text-center text-xs text-encre-doux">
        En créant un compte, vous acceptez les{" "}
        <Link href="/plans/conditions" className="underline underline-offset-4">conditions d&apos;utilisation</Link> et la{" "}
        <Link href="/plans/mentions-legales" className="underline underline-offset-4">politique de confidentialité</Link>.
      </p>
    </main>
  );
}
