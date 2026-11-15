import type { Metadata } from "next";
import Link from "next/link";
import { LogoPlan } from "@/components/plan/LogoPlan";
import { PiedDePage } from "@/components/PiedDePage";
import { Courriel, EDITEUR, Section } from "@/components/legal/Legal";

export const metadata: Metadata = { title: { absolute: "Conditions d'utilisation · Mon plan de salle" } };

const MISE_A_JOUR = "novembre 2026";

export default function ConditionsPlan() {
  return (
    <>
      <main className="mx-auto w-full max-w-2xl px-4 py-10 leading-relaxed">
        <Link href="/plan-de-salle" className="inline-block">
          <LogoPlan />
        </Link>
        <h1 className="mt-8 text-2xl font-medium">Conditions d&apos;utilisation</h1>
        <p className="mt-2 text-sm text-encre-doux">Dernière mise à jour : {MISE_A_JOUR}</p>

        <Section titre="1. Le service">
          <p>
            Mon plan de salle, édité par {EDITEUR.nom}, permet de dessiner le plan d&apos;une salle de réception, de
            placer les tables et les invités, et de partager ce plan avec d&apos;autres personnes (mariés, lieu de
            réception, wedding planner, prestataires). Utiliser le service implique d&apos;accepter ces conditions.
          </p>
        </Section>

        <Section titre="2. Votre compte">
          <p>
            Un compte est nécessaire pour créer et modifier des plans. Vous indiquez une adresse e-mail valide et vous
            gardez votre accès pour vous (lien de connexion, code, mot de passe).
          </p>
          <p>
            Le service est actuellement gratuit. Des formules payantes pourront être proposées plus tard : vous en serez
            informé à l&apos;avance, et vous garderez l&apos;accès à vos plans existants.
          </p>
        </Section>

        <Section titre="3. Ce que vous mettez dans vos plans">
          <p>
            Vous restez propriétaire de vos plans et de leur contenu. Vous nous autorisez seulement à les enregistrer et
            à les afficher aux personnes avec qui vous les partagez, pour faire fonctionner le service.
          </p>
          <p>
            Vous vous engagez à ne saisir que des informations utiles à l&apos;organisation de la réception, avec
            l&apos;accord des invités concernés, et à n&apos;inscrire aucune information médicale ni aucun contenu
            illicite ou blessant.
          </p>
        </Section>

        <Section titre="4. Partage">
          <p>
            Vous choisissez qui accède à vos plans et avec quel rôle. Un lien de partage donne accès au plan à toute
            personne qui le possède : transmettez-le avec soin, et désactivez-le s&apos;il n&apos;est plus utile.
          </p>
          <p>
            Relier votre plan à l&apos;organisation d&apos;une wedding planner (Ma Coordo) n&apos;est possible qu&apos;avec
            votre accord ; vous pouvez ensuite retirer son accès depuis le bouton « Partager » du plan.
          </p>
        </Section>

        <Section titre="5. Salles des lieux de réception">
          <p>
            Un lieu de réception peut proposer une salle « modèle » dont certains éléments sont fixés (murs, poteaux,
            portes…). Le lieu est responsable des informations qu&apos;il fournit.
          </p>
        </Section>

        <Section titre="6. Un plan reste indicatif">
          <p>
            Les mesures, les alertes d&apos;espacement et les récapitulatifs sont une aide à la préparation. Ils ne
            remplacent ni une visite des lieux, ni les règles de sécurité de l&apos;établissement (capacité maximale,
            issues de secours, circulation), qui restent à vérifier avec le lieu de réception.
          </p>
        </Section>

        <Section titre="7. Disponibilité">
          <p>
            Nous faisons le maximum pour que le service soit disponible et que vos plans soient bien conservés, sans
            pouvoir garantir une absence totale d&apos;interruption. Pensez à imprimer ou à exporter votre plan avant le
            jour J.
          </p>
        </Section>

        <Section titre="8. Responsabilité">
          <p>
            {EDITEUR.nom} ne peut être tenue responsable d&apos;un dommage indirect lié à l&apos;utilisation du service,
            ni des contenus saisis par les utilisateurs. Sa responsabilité est limitée à ce que permet la loi.
          </p>
        </Section>

        <Section titre="9. Fin d'utilisation">
          <p>
            Vous pouvez supprimer votre compte à tout moment depuis « Mon compte ». En cas d&apos;utilisation contraire
            à ces conditions, un compte peut être suspendu, après un message d&apos;avertissement sauf urgence.
          </p>
        </Section>

        <Section titre="10. Droit applicable et contact">
          <p>
            Ces conditions sont soumises au droit français. En cas de difficulté, écrivez-nous d&apos;abord à <Courriel /> :
            nous chercherons une solution amiable. À défaut, les tribunaux français sont compétents.
          </p>
        </Section>

        <p className="mt-10 text-sm">
          Voir aussi : <Link href="/plans/mentions-legales" className="underline underline-offset-4">mentions légales et confidentialité</Link>
        </p>
      </main>
      <PiedDePage marque="plan" />
    </>
  );
}
