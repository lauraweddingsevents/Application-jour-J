import { BoutonLien } from "@/components/ui/Bouton";
import { Logo } from "@/components/Logo";

// Page provisoire : la vraie connexion par lien magique arrive à l'étape 4.
export default function Connexion() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <Logo taille="grand" />
      <h1 className="mt-8 text-xl font-medium">Bientôt disponible</h1>
      <p className="mt-3 text-encre-doux">
        La connexion par e-mail arrive très vite. Merci de votre patience !
      </p>
      <BoutonLien href="/" variante="secondaire" className="mt-8">
        Retour à l&apos;accueil
      </BoutonLien>
    </main>
  );
}
