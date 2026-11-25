import { Suspense } from "react";
import { Logo } from "@/components/Logo";
import { Confirmation } from "./Confirmation";

// Page ouverte quand on clique sur le lien reçu par e-mail
export default function PageConfirmation() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <Logo taille="grand" />
      <Suspense fallback={<p className="mt-8 text-encre-doux">Connexion en cours…</p>}>
        <Confirmation />
      </Suspense>
    </main>
  );
}
