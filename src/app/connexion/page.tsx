import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { FormulaireConnexion } from "./FormulaireConnexion";

export const metadata: Metadata = { title: "Connexion" };

export default function Connexion() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-14">
      <Link href="/" className="self-center">
        <Logo taille="grand" />
      </Link>
      <h1 className="mt-10 text-center text-xl font-medium">
        Accéder à mes mariages
      </h1>
      <p className="mt-2 text-center text-encre-doux">
        Pas de mot de passe : nous vous envoyons un lien de connexion par
        e-mail.
      </p>
      <FormulaireConnexion />
    </main>
  );
}
