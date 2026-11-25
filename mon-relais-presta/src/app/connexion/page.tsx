import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { FormulaireConnexion } from "./FormulaireConnexion";

export const metadata: Metadata = { title: "Connexion" };

export default function PageConnexion() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-14">
      <Link href="/" className="self-center"><Logo taille="grand" /></Link>
      <h1 className="mt-10 text-center text-xl font-medium">Se connecter ou rejoindre</h1>
      <p className="mt-2 text-center text-encre-doux">
        Recevez un lien de connexion par e-mail : pas de mot de passe à retenir.
      </p>
      <FormulaireConnexion />
    </main>
  );
}
