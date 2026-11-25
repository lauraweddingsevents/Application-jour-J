import { Logo } from "@/components/Logo";

export const metadata = { title: "Pas de réseau" };

// Affichée par le téléphone quand il n'y a pas de connexion
export default function HorsLigne() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <Logo taille="grand" />
      <p className="mt-10 text-3xl" aria-hidden>📶</p>
      <h1 className="mt-3 text-xl font-medium">Pas de connexion</h1>
      <p className="mt-2 text-encre-doux">Les demandes s&apos;afficheront dès que le réseau sera revenu.</p>
    </main>
  );
}
