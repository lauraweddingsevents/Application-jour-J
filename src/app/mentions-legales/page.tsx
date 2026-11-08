import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";

export const metadata: Metadata = {
  title: "Mentions légales et confidentialité",
};

// Version provisoire : elle sera complétée à l'étape 12 (adresse, hébergeurs définitifs).
export default function MentionsLegales() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <Link href="/" className="inline-block">
        <Logo />
      </Link>
      <h1 className="mt-8 text-2xl font-medium">
        Mentions légales et confidentialité
      </h1>

      <section className="mt-8 space-y-2">
        <h2 className="text-lg font-medium text-or-fonce">Éditeur du site</h2>
        <p>Laura Weddings &amp; Events</p>
        <p>SIRET : 831 141 957 00033</p>
        <p>Adresse : [à compléter]</p>
        <p>
          Contact :{" "}
          <a
            className="underline underline-offset-4"
            href="mailto:laura.weddings.events@gmail.com"
          >
            laura.weddings.events@gmail.com
          </a>
        </p>
      </section>

      <section className="mt-8 space-y-2">
        <h2 className="text-lg font-medium text-or-fonce">Hébergement</h2>
        <p>
          Site hébergé par Vercel Inc., 440 N Barranca Ave #4133, Covina, CA
          91723, États-Unis. Données stockées par Supabase, sur des serveurs
          situés dans l&apos;Union européenne.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-medium text-or-fonce">
          Vos données personnelles
        </h2>
        <p>
          Ma Coordo conserve uniquement les informations utiles à
          l&apos;organisation du mariage : nom et rôle des intervenants, et, si
          la personne qui crée le déroulé les renseigne, leur téléphone et leur
          e-mail.
        </p>
        <p>
          Les téléphones et e-mails ne sont visibles que par la personne qui a
          créé le déroulé. Ils n&apos;apparaissent dans la fiche pratique que
          si elle choisit de les y afficher.
        </p>
        <p>
          Aucune donnée n&apos;est vendue ni utilisée à des fins publicitaires.
          Vous pouvez demander à consulter, corriger ou supprimer vos données à
          tout moment en écrivant à l&apos;adresse de contact ci-dessus.
        </p>
      </section>
    </main>
  );
}
