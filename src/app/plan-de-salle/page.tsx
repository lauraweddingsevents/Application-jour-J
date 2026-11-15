import type { Metadata } from "next";
import { BoutonLien } from "@/components/ui/Bouton";
import { Carte } from "@/components/ui/Carte";
import { DessinPlan } from "@/components/plan/DessinPlan";
import { LogoPlan } from "@/components/plan/LogoPlan";
import { PiedDePage } from "@/components/PiedDePage";
import { planExemple } from "@/plan/exemple";

export const metadata: Metadata = {
  title: { absolute: "Mon plan de salle – Le plan de table à l'échelle, simple et partagé" },
  description:
    "Dessinez votre salle de réception à l'échelle, placez tables et invités, et partagez le plan avec votre lieu, votre traiteur et votre décoratrice.",
};

const atouts = [
  { titre: "À l'échelle, vraiment", texte: "Dimensions de la salle, tables, chaises, piste : vous voyez tout de suite si ça passe." },
  { titre: "Des alertes qui évitent les mauvaises surprises", texte: "Passage trop étroit entre deux tables, table qui dépasse, trop d'invités : c'est signalé." },
  { titre: "Partagé avec ceux qui comptent", texte: "Votre lieu, votre traiteur, votre décoratrice voient toujours la dernière version." },
];

export default function AccueilPlan() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <main className="mx-auto w-full max-w-xl flex-1 px-4 pt-14 pb-6">
        <header className="text-center">
          <LogoPlan taille="grand" />
          <h1 className="mt-8 text-2xl font-medium leading-snug">
            Votre plan de salle,
            <br />à l&apos;échelle et partagé.
          </h1>
          <p className="mt-4 text-encre-doux">
            Pour les futurs mariés, les lieux de réception et les décoratrices.
            Depuis votre téléphone, sans rien installer.
          </p>
        </header>

        <div className="mt-8 overflow-hidden rounded-carte bg-blanc p-3 ring-1 ring-or-clair/50">
          <DessinPlan plan={planExemple("Exemple", true)} className="h-auto w-full" />
        </div>

        <div className="mt-8 flex flex-col gap-3">
          <BoutonLien href="/plans/connexion?suite=/plans">Créer mon plan gratuitement</BoutonLien>
          <BoutonLien href="/plans/connexion?suite=/plans" variante="secondaire">
            J&apos;ai déjà un compte
          </BoutonLien>
        </div>

        <ul className="mt-10 flex flex-col gap-3">
          {atouts.map((a) => (
            <li key={a.titre}>
              <Carte>
                <h2 className="font-medium">{a.titre}</h2>
                <p className="mt-1 text-sm text-encre-doux">{a.texte}</p>
              </Carte>
            </li>
          ))}
        </ul>
      </main>
      <PiedDePage />
    </div>
  );
}
