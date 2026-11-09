import { Logo } from "@/components/Logo";

export const metadata = { title: "Pas de réseau" };

// Affichée quand on ouvre une page jamais consultée, sans réseau
export default function HorsLigne() {
  return (
    <main className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <Logo taille="grand" />
      <p className="mt-8 text-4xl" aria-hidden>📡</p>
      <h1 className="mt-4 text-xl font-medium">Pas de réseau pour le moment</h1>
      <p className="mt-3 text-encre-doux">
        Cette page n&apos;a pas encore été enregistrée sur votre téléphone. Elle
        s&apos;affichera dès le retour du réseau.
      </p>
      <p className="mt-3 text-sm text-encre-doux">
        Astuce : ouvrez votre lien une fois avec du réseau, il restera ensuite
        disponible même hors connexion.
      </p>
    </main>
  );
}
