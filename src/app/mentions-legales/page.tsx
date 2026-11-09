import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/Logo";

export const metadata: Metadata = {
  title: "Mentions légales et confidentialité",
};

// Coordonnées de l'éditeur : à mettre à jour ici si elles changent
const EDITEUR = {
  nom: "Laura Weddings & Events",
  siret: "831 141 957 00033",
  adresse: "[adresse postale à compléter]",
  email: "laura.weddings.events@gmail.com",
};
const MISE_A_JOUR = "novembre 2026";

function Section({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <section className="mt-8 space-y-3">
      <h2 className="text-lg font-medium text-or-fonce">{titre}</h2>
      {children}
    </section>
  );
}

export default function MentionsLegales() {
  const mail = (
    <a className="underline underline-offset-4" href={`mailto:${EDITEUR.email}`}>
      {EDITEUR.email}
    </a>
  );
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10 leading-relaxed">
      <Link href="/" className="inline-block">
        <Logo />
      </Link>
      <h1 className="mt-8 text-2xl font-medium">Mentions légales et confidentialité</h1>
      <p className="mt-2 text-sm text-encre-doux">Dernière mise à jour : {MISE_A_JOUR}</p>

      <Section titre="Éditeur du service">
        <p>
          Ma Coordo est édité par {EDITEUR.nom}, entreprise immatriculée sous le
          numéro SIRET {EDITEUR.siret}.
          <br />
          Adresse : {EDITEUR.adresse}
          <br />
          Contact : {mail}
          <br />
          Responsable de la publication : la dirigeante de {EDITEUR.nom}.
        </p>
      </Section>

      <Section titre="Hébergement">
        <p>
          Le site est hébergé par Vercel Inc., 440 N Barranca Ave #4133, Covina,
          CA 91723, États-Unis (vercel.com).
        </p>
        <p>
          Les données sont stockées par Supabase Inc. (supabase.com), sur des
          serveurs situés en France (région Europe – Paris).
        </p>
      </Section>

      <Section titre="Quelles données, et pourquoi ?">
        <p>Ma Coordo traite uniquement les données utiles à l&apos;organisation du jour J :</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Compte de la personne qui crée le déroulé</strong> : adresse
            e-mail, pour la connexion par lien ou code.
          </li>
          <li>
            <strong>Mariage et déroulé</strong> : prénoms des mariés, date, lieux,
            horaires, notes, fiche pratique.
          </li>
          <li>
            <strong>Intervenants</strong> : nom, rôle, et facultativement
            téléphone et e-mail, saisis par la personne qui crée le déroulé.
          </li>
          <li>
            <strong>Alertes</strong> : si un intervenant les active, une adresse
            technique de notification propre à son téléphone et le délai choisi.
          </li>
        </ul>
        <p>
          Base légale : l&apos;exécution du service demandé (organisation du
          mariage) et l&apos;intérêt légitime des organisateurs à coordonner les
          intervenants.
        </p>
      </Section>

      <Section titre="Qui voit quoi ?">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Les <strong>téléphones et e-mails des intervenants</strong> ne sont
            visibles que par la personne qui a créé le déroulé. Ils
            n&apos;apparaissent dans la fiche pratique que si elle choisit de les
            y ajouter.
          </li>
          <li>
            Chaque intervenant reçoit un <strong>lien personnel</strong>, difficile
            à deviner, qui donne accès au déroulé et à la fiche pratique de ce
            mariage uniquement. Ces liens ne sont pas référencés par les moteurs
            de recherche.
          </li>
          <li>
            Certaines informations de la fiche pratique peuvent être réservées aux
            prestataires.
          </li>
        </ul>
        <p>Aucune donnée n&apos;est vendue, louée ou utilisée à des fins publicitaires.</p>
      </Section>

      <Section titre="Sous-traitants">
        <ul className="list-disc space-y-1 pl-5">
          <li>Supabase : base de données, connexion, temps réel (données en France).</li>
          <li>Vercel : hébergement du site.</li>
          <li>Google (Gmail) : envoi des e-mails de connexion.</li>
          <li>
            Les services de notification des navigateurs (Google, Apple, Mozilla)
            acheminent les alertes jusqu&apos;aux téléphones.
          </li>
        </ul>
        <p>
          Certains de ces prestataires sont situés aux États-Unis ; les transferts
          sont encadrés par les clauses contractuelles types de la Commission
          européenne ou le cadre de protection des données UE–États-Unis.
        </p>
      </Section>

      <Section titre="Durée de conservation">
        <p>
          Les données d&apos;un mariage sont conservées tant que la personne qui l&apos;a
          créé ne le supprime pas. La suppression d&apos;un mariage efface
          définitivement son déroulé, ses intervenants, sa fiche pratique et
          désactive tous ses liens. Un compte et ses données peuvent être
          supprimés sur simple demande.
        </p>
      </Section>

      <Section titre="Sur votre téléphone">
        <p>
          Pour fonctionner sans réseau, Ma Coordo garde sur votre téléphone une
          copie du dernier déroulé consulté et vos réglages (délai des alertes).
          Aucun cookie publicitaire ni outil de mesure d&apos;audience n&apos;est
          utilisé. Seul un cookie technique maintient la connexion de la personne
          qui crée le déroulé.
        </p>
      </Section>

      <Section titre="Vos droits">
        <p>
          Vous pouvez à tout moment demander l&apos;accès, la rectification ou la
          suppression de vos données, ou vous opposer à leur traitement, en
          écrivant à {mail}. Réponse sous un mois au plus tard.
        </p>
        <p>
          Si vous estimez que vos droits ne sont pas respectés, vous pouvez
          adresser une réclamation à la CNIL (cnil.fr).
        </p>
      </Section>
    </main>
  );
}
