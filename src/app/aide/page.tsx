import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Carte } from "@/components/ui/Carte";
import { Logo } from "@/components/Logo";

export const metadata: Metadata = { title: "Aide" };

function Question({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <details className="group rounded-carte bg-blanc ring-1 ring-or-clair/50 open:shadow-sm">
      <summary className="flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-3 px-5 font-medium">
        {titre}
        <span aria-hidden className="text-or-fonce transition-transform group-open:rotate-45">+</span>
      </summary>
      <div className="space-y-2 px-5 pb-5 text-encre-doux">{children}</div>
    </details>
  );
}

export default function Aide() {
  return (
    <main className="mx-auto w-full max-w-xl px-4 py-10">
      <Link href="/" className="inline-block">
        <Logo />
      </Link>
      <h1 className="mt-8 text-2xl font-medium">Comment ça marche ?</h1>
      <p className="mt-2 text-encre-doux">
        Ma Coordo partage le déroulé du jour J avec chaque prestataire et chaque
        proche qui a une mission. Pas de compte, pas d&apos;application à
        télécharger : un simple lien.
      </p>

      <h2 className="mt-10 text-sm font-medium uppercase tracking-wider text-or-fonce">
        Vous avez reçu un lien
      </h2>
      <div className="mt-3 flex flex-col gap-2">
        <Question titre="Que vais-je voir ?">
          <p>
            Le moment en cours, votre prochaine mission (heure, lieu, consignes),
            la liste de vos moments, tout le déroulé de la journée et les infos
            pratiques : contacts, adresses avec itinéraire, plan B météo.
          </p>
        </Question>
        <Question titre="Les horaires peuvent-ils changer ?">
          <p>
            Oui, et vous le verrez tout de suite : la page se met à jour toute
            seule, sans la recharger. Un bandeau « Horaires mis à jour » vous
            prévient, et les moments concernés portent la mention « Nouvel horaire ».
          </p>
        </Question>
        <Question titre="Comment être prévenu·e avant mes moments ?">
          <p>
            Dans le bloc « Alertes avant vos moments », choisissez le délai (de 5
            à 60 minutes), puis touchez « Activer les alertes sur ce téléphone »
            et acceptez les notifications. Faites un essai avec « Recevoir une
            alerte de test ».
          </p>
          <p>
            <strong>Sur iPhone</strong>, ajoutez d&apos;abord le lien à
            l&apos;écran d&apos;accueil (voir ci-dessous), ouvrez-le depuis
            l&apos;icône « Jour J », puis activez les alertes.
          </p>
          <p>
            Si la page est ouverte, le téléphone vibre aussi et un bandeau
            s&apos;affiche avant chacun de vos moments.
          </p>
        </Question>
        <Question titre="Comment l'ajouter à l'écran d'accueil ?">
          <p>
            <strong>iPhone</strong> : ouvrez le lien dans Safari, touchez le
            bouton Partager (carré avec une flèche ⬆️), puis « Sur l&apos;écran
            d&apos;accueil », puis « Ajouter ».
          </p>
          <p>
            <strong>Android</strong> : dans Chrome, touchez le menu ⋮ puis
            « Ajouter à l&apos;écran d&apos;accueil » ou « Installer
            l&apos;application ».
          </p>
          <p>L&apos;icône « Jour J » ouvre directement votre déroulé.</p>
        </Question>
        <Question titre="Et s'il n'y a pas de réseau sur place ?">
          <p>
            Ouvrez votre lien au moins une fois avec du réseau avant le jour J
            (idéalement la veille). Ensuite, même sans réseau, le dernier déroulé
            reste affiché. Il se met à jour dès que le réseau revient.
          </p>
        </Question>
        <Question titre="Puis-je transmettre mon lien ?">
          <p>
            Non : il vous est personnel et montre vos missions. Si un collègue
            vous accompagne, demandez à l&apos;organisatrice de l&apos;ajouter :
            il recevra son propre lien.
          </p>
        </Question>
        <Question titre="J'ai un bouton « Retard », pourquoi ?">
          <p>
            L&apos;organisatrice vous a confié l&apos;accès coordination. En cas
            de retard, touchez « ⏱ Retard » sur le moment concerné, choisissez la
            durée et si la suite de la journée doit être décalée. Tout le monde
            voit les nouveaux horaires immédiatement.
          </p>
        </Question>
      </div>

      <Carte className="mt-10 text-center text-sm text-encre-doux">
        Une question sur le mariage ? Contactez directement l&apos;organisatrice :
        son numéro figure dans l&apos;onglet « Infos pratiques » de votre lien.
        <br />
        <Link href="/mentions-legales" className="mt-2 inline-block underline underline-offset-4">
          Mentions légales et confidentialité
        </Link>
      </Carte>
    </main>
  );
}
