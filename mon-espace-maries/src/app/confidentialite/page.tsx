import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "Politique de confidentialité" };

// Coordonnées de l'éditeur : à mettre à jour ici si elles changent
const EDITEUR = {
  nom: "Laura Weddings & Events",
  siret: "831 141 957 00033",
  adresse: "2 rue Serge Sabatier, 13140 Miramas, France",
  email: "laura.weddings.events@gmail.com",
};
const MISE_A_JOUR = { fr: "novembre 2026", en: "November 2026" };

function Section({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <section className="mt-7 space-y-2.5">
      <h2 className="font-titre text-2xl font-semibold text-bordeaux">{titre}</h2>
      {children}
    </section>
  );
}

// Texte à relire par Laura avant la mise en service
export default async function Confidentialite({ searchParams }: PageProps<"/confidentialite">) {
  const en = (await searchParams).lang === "en";
  const mail = <a className="text-bordeaux underline underline-offset-4" href={`mailto:${EDITEUR.email}`}>{EDITEUR.email}</a>;
  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-10 text-[15px] leading-relaxed">
      <div className="flex items-center justify-between gap-3">
        <Link href="/connexion" className="text-sm font-medium text-bordeaux">‹ Mon Espace Mariés</Link>
        <Link href={en ? "/confidentialite" : "/confidentialite?lang=en"} className="text-sm font-semibold text-bordeaux">{en ? "Français" : "English"}</Link>
      </div>
      <h1 className="mt-6 font-titre text-4xl font-semibold">{en ? "Privacy policy" : "Politique de confidentialité"}</h1>
      <p className="mt-1 text-sm text-doux">{en ? "Last updated" : "Dernière mise à jour"} : {MISE_A_JOUR[en ? "en" : "fr"]}</p>

      {en ? (
        <>
          <Section titre="Who is responsible">
            <p>Mon Espace Mariés is provided by {EDITEUR.nom} (SIRET {EDITEUR.siret}), {EDITEUR.adresse}. Contact: {mail}.</p>
          </Section>
          <Section titre="What data, and why">
            <ul className="list-disc space-y-1 pl-5">
              <li><strong>The couple</strong>: first names, email addresses, phone numbers, wedding date and venue, chosen package.</li>
              <li><strong>Your planning</strong>: timeline, budget, payment schedule, appointments, tasks, suppliers, loved ones (name, role, phone), documents, questionnaire answers.</li>
              <li><strong>Guests</strong>: the first name they enter (optional) and the photos and videos they choose to share, only after ticking the consent box.</li>
              <li><strong>Technical data</strong>: last sign-in date, and, if you turn them on, a notification address for your phone.</li>
            </ul>
            <p>This data is used solely to organise your wedding. Legal basis: performance of the contract with {EDITEUR.nom}; consent for guests&apos; photos and videos.</p>
          </Section>
          <Section titre="Who can see what">
            <p>Each couple only sees their own space. Laura sees all spaces she manages. Her private notes are never visible to the couple. The album is only visible to the couple from the day after the wedding at 10 am. No data is sold or used for advertising.</p>
          </Section>
          <Section titre="How long it is kept">
            <p>All the couple&apos;s data (space, loved ones, documents, photos and videos) is <strong>automatically deleted 6 months after the wedding</strong>. You can download everything beforehand, and ask Laura for an export or an immediate deletion at any time.</p>
          </Section>
          <Section titre="Hosting and security">
            <p>Data and files are stored by Supabase in the European Union (Paris region). The website is served by Vercel. All connections are encrypted (HTTPS), and sign-in uses a single-use link with no password. Emails are sent via Google (Gmail); phone notifications go through the browsers&apos; notification services (Google, Apple, Mozilla).</p>
          </Section>
          <Section titre="Your rights">
            <p>You have the right to access, rectify, delete, export and object to the processing of your data. Write to {mail}. You may also lodge a complaint with the CNIL (cnil.fr).</p>
          </Section>
        </>
      ) : (
        <>
          <Section titre="Responsable du traitement">
            <p>Mon Espace Mariés est proposé par {EDITEUR.nom} (SIRET {EDITEUR.siret}), {EDITEUR.adresse}. Contact : {mail}.</p>
          </Section>
          <Section titre="Quelles données, et pourquoi ?">
            <ul className="list-disc space-y-1 pl-5">
              <li><strong>Le couple</strong> : prénoms, adresses e-mail, téléphones, date et lieu du mariage, formule choisie.</li>
              <li><strong>L&apos;organisation</strong> : rétroplanning, budget, échéancier, rendez-vous, tâches, prestataires, proches (nom, rôle, téléphone), documents, réponses au questionnaire.</li>
              <li><strong>Les invités</strong> : le prénom saisi (facultatif) et les photos et vidéos qu&apos;ils choisissent de partager, uniquement après avoir coché la case de consentement.</li>
              <li><strong>Données techniques</strong> : date de dernière connexion et, si vous les activez, une adresse de notification propre à votre téléphone.</li>
            </ul>
            <p>Ces données servent uniquement à l&apos;organisation de votre mariage. Base légale : l&apos;exécution du contrat conclu avec {EDITEUR.nom} ; le consentement pour les photos et vidéos des invités.</p>
          </Section>
          <Section titre="Qui voit quoi ?">
            <p>Chaque couple ne voit que son propre espace. Laura voit les espaces qu&apos;elle gère. Ses notes privées ne sont jamais visibles par les mariés. L&apos;album n&apos;est visible par le couple qu&apos;à partir du lendemain du mariage, 10 h. Aucune donnée n&apos;est vendue ni utilisée à des fins publicitaires.</p>
          </Section>
          <Section titre="Durée de conservation">
            <p>Toutes les données du couple (espace, proches, documents, photos et vidéos) sont <strong>supprimées automatiquement 6 mois après le mariage</strong>. Vous pouvez tout télécharger avant, et demander à Laura un export ou une suppression immédiate à tout moment.</p>
          </Section>
          <Section titre="Hébergement et sécurité">
            <p>Les données et les fichiers sont stockés par Supabase dans l&apos;Union européenne (région Paris). Le site est servi par Vercel. Toutes les connexions sont chiffrées (HTTPS) et la connexion se fait par un lien à usage unique, sans mot de passe. Les e-mails sont envoyés via Google (Gmail) ; les notifications sur téléphone passent par les services des navigateurs (Google, Apple, Mozilla).</p>
          </Section>
          <Section titre="Vos droits">
            <p>Vous disposez d&apos;un droit d&apos;accès, de rectification, d&apos;effacement, de portabilité et d&apos;opposition. Écrivez à {mail}. Vous pouvez aussi adresser une réclamation à la CNIL (cnil.fr).</p>
          </Section>
        </>
      )}
    </main>
  );
}
