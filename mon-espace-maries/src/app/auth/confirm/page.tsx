import { Suspense } from "react";
import { Confirmation } from "./Confirmation";

// Page ouverte quand on clique sur le lien reçu par e-mail
export default function PageConfirmation() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <p className="font-titre text-3xl font-semibold">Mon Espace Mariés</p>
      <Suspense fallback={<p className="mt-8 text-doux">Connexion en cours…</p>}>
        <Confirmation />
      </Suspense>
    </main>
  );
}
