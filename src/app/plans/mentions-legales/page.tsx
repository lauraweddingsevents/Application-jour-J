import type { Metadata } from "next";
import Link from "next/link";
import { LogoPlan } from "@/components/plan/LogoPlan";
import { PiedDePage } from "@/components/PiedDePage";
import { Courriel, EDITEUR, Section } from "@/components/legal/Legal";

export const metadata: Metadata = { title: { absolute: "Mentions légales et confidentialité · Mon plan de salle" } };

const MISE_A_JOUR = "novembre 2026";

export default function MentionsPlan() {
  return (
    <>
      <main className="mx-auto w-full max-w-2xl px-4 py-10 leading-relaxed">
        <Link href="/plan-de-salle" className="inline-block">
          <LogoPlan />
        </Link>
        <h1 className="mt-8 text-2xl font-medium">Mentions légales et confidentialité</h1>
        <p className="mt-2 text-sm text-encre-doux">Dernière mise à jour : {MISE_A_JOUR}</p>

        <Section titre="Éditeur du service">
          <p>
            Mon plan de salle est édité par {EDITEUR.nom}, entreprise immatriculée sous le numéro SIRET {EDITEUR.siret}.
            <br />
            Adresse : {EDITEUR.adresse}
            <br />
            Contact : <Courriel />
            <br />
            Responsable de la publication : la dirigeante de {EDITEUR.nom}.
          </p>
        </Section>

        <Section titre="Hébergement">
          <p>Le site est hébergé par Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis (vercel.com).</p>
          <p>Les données sont stockées par Supabase Inc. (supabase.com), sur des serveurs situés en France (région Europe – Paris).</p>
        </Section>

        <Section titre="Quelles données, et pourquoi ?">
          <p>Mon plan de salle traite uniquement les données utiles à la préparation de votre plan :</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Votre compte</strong> : adresse e-mail (connexion), nom ou nom de société, type de compte
              (mariés, lieu, décoratrice…), et un mot de passe si vous en choisissez un (il est enregistré chiffré).
            </li>
            <li>
              <strong>Vos plans</strong> : dimensions de la salle, tables, zones, notes, et l&apos;historique des
              versions (les 60 dernières copies automatiques et les versions que vous nommez).
            </li>
            <li>
              <strong>Les invités</strong> que vous saisissez : nom, table, et si vous le souhaitez un menu (enfant,
              végétarien…) avec une précision.
            </li>
            <li>
              <strong>Le partage</strong> : adresses e-mail des personnes que vous invitez, leur rôle, les liens de
              partage créés et les commentaires laissés sur le plan.
            </li>
          </ul>
          <p>
            Base légale : l&apos;exécution du service que vous utilisez (création et partage de vos plans de salle).
          </p>
        </Section>

        <Section titre="Menus des invités : à savoir">
          <p>
            Le choix d&apos;un menu est facultatif et sert uniquement à l&apos;organisation du repas. Certains menus
            (halal, casher…) peuvent laisser deviner des convictions : ne les indiquez qu&apos;avec l&apos;accord des
            invités concernés. N&apos;inscrivez <strong>aucune information médicale</strong> (maladie, traitement…)
            dans les menus ou les notes.
          </p>
          <p>
            Lorsque vous saisissez des invités, vous vous assurez qu&apos;ils sont d&apos;accord pour figurer sur le plan.
          </p>
        </Section>

        <Section titre="Qui voit vos plans ?">
          <ul className="list-disc space-y-1 pl-5">
            <li>Vous, et les personnes à qui vous donnez accès, avec le rôle choisi (lecture, modification, propriétaire).</li>
            <li>
              Toute personne qui possède un <strong>lien de partage</strong> en lecture voit le plan, sans compte. Vous
              pouvez désactiver un lien à tout moment.
            </li>
            <li>
              Si votre plan est créé à partir de la <strong>salle d&apos;un lieu de réception</strong>, ce lieu le voit
              en lecture seule, seulement si vous l&apos;avez accepté.
            </li>
            <li>
              Si vous acceptez qu&apos;une <strong>wedding planner</strong> relie votre plan à l&apos;organisation de votre
              mariage (Ma Coordo), cette personne peut le voir et le modifier, et les prestataires du mariage en reçoivent une version adaptée
              à leur métier. <strong>Les noms des invités ne sont transmis qu&apos;aux personnes chargées de la
              coordination</strong> : le traiteur, par exemple, ne reçoit que le nombre de couverts et les menus.
            </li>
          </ul>
          <p>Aucune donnée n&apos;est vendue, louée ou utilisée à des fins publicitaires.</p>
        </Section>

        <Section titre="Sous-traitants">
          <ul className="list-disc space-y-1 pl-5">
            <li>Supabase : base de données, connexion, temps réel (données en France).</li>
            <li>Vercel : hébergement du site.</li>
            <li>Google (Gmail) : envoi des e-mails de connexion.</li>
          </ul>
          <p>
            Certains de ces prestataires sont situés aux États-Unis ; les transferts sont encadrés par les clauses
            contractuelles types de la Commission européenne ou le cadre de protection des données UE–États-Unis.
          </p>
        </Section>

        <Section titre="Durée de conservation">
          <p>
            Vos plans sont conservés tant que votre compte existe et que vous ne les supprimez pas. Vous pouvez
            supprimer votre compte à tout moment depuis « Mon compte » : votre compte et les plans dont vous êtes
            propriétaire sont alors effacés définitivement, y compris pour les personnes avec qui vous les aviez
            partagés.
          </p>
        </Section>

        <Section titre="Sur votre téléphone">
          <p>
            Pour fonctionner avec peu de réseau, Mon plan de salle garde sur votre appareil une copie de vos plans et
            de vos modifications en attente d&apos;envoi. Aucun cookie publicitaire ni outil de mesure d&apos;audience
            n&apos;est utilisé. Seul un cookie technique maintient votre connexion.
          </p>
        </Section>

        <Section titre="Vos droits">
          <p>
            Vous pouvez à tout moment demander l&apos;accès, la rectification ou la suppression de vos données, ou vous
            opposer à leur traitement, en écrivant à <Courriel />. Réponse sous un mois au plus tard.
          </p>
          <p>Si vous estimez que vos droits ne sont pas respectés, vous pouvez adresser une réclamation à la CNIL (cnil.fr).</p>
        </Section>

        <p className="mt-10 text-sm">
          Voir aussi : <Link href="/plans/conditions" className="underline underline-offset-4">conditions d&apos;utilisation</Link>
        </p>
      </main>
      <PiedDePage marque="plan" />
    </>
  );
}
