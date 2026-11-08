import { BoutonLien } from "@/components/ui/Bouton";
import { Carte } from "@/components/ui/Carte";
import { Logo } from "@/components/Logo";
import { PiedDePage } from "@/components/PiedDePage";

const etapes = [
  {
    titre: "Vous créez le déroulé",
    texte:
      "Les moments de la journée, leurs horaires, leurs lieux et qui s'en occupe.",
  },
  {
    titre: "Chacun reçoit son lien",
    texte:
      "Prestataires, témoins, famille : un lien personnel, sans compte ni application à télécharger.",
  },
  {
    titre: "Tout le monde reste synchronisé",
    texte:
      "Un retard ? Vous décalez l'horaire, et chacun le voit aussitôt sur son téléphone.",
  },
];

export default function Accueil() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <main className="mx-auto w-full max-w-xl flex-1 px-4 pt-14 pb-6">
        <header className="text-center">
          <Logo taille="grand" />
          <h1 className="mt-8 text-2xl font-medium leading-snug">
            Le déroulé du jour J,
            <br />
            partagé en temps réel.
          </h1>
          <p className="mt-4 text-encre-doux">
            L&apos;outil de coordination qui permet à chaque prestataire et à
            chaque proche de savoir où être, et quand.
          </p>
        </header>

        <div className="mt-10 flex flex-col gap-3">
          {/* Les pages de connexion arrivent à l'étape 4 */}
          <BoutonLien href="/connexion">Créer mon déroulé</BoutonLien>
          <BoutonLien href="/connexion" variante="secondaire">
            J&apos;ai déjà un compte
          </BoutonLien>
        </div>

        <ol className="mt-12 flex flex-col gap-4">
          {etapes.map((etape, i) => (
            <li key={etape.titre}>
              <Carte className="flex gap-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-creme text-or-fonce font-medium">
                  {i + 1}
                </span>
                <div>
                  <h2 className="font-medium">{etape.titre}</h2>
                  <p className="mt-1 text-sm text-encre-doux">{etape.texte}</p>
                </div>
              </Carte>
            </li>
          ))}
        </ol>

        <p className="mt-10 text-center text-sm text-encre-doux">
          Vous avez reçu un lien pour un mariage ? Ouvrez-le simplement : vos
          missions s&apos;affichent directement.
        </p>
      </main>
      <PiedDePage />
    </div>
  );
}
