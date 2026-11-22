"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { BoutonLien } from "@/components/ui/Bouton";
import { useMembre } from "@/lib/membre";
import { ZONES } from "@/lib/zones";

// Page d'accueil publique ; une personne déjà connectée va directement aux demandes
export function Accueil() {
  const router = useRouter();
  const { session } = useMembre();

  useEffect(() => {
    if (session) router.replace("/demandes");
  }, [session, router]);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center px-4 py-14 text-center">
      <Logo taille="grand" />
      <h1 className="mt-10 text-2xl font-light leading-snug">
        Une demande de mariés que vous ne pouvez pas prendre ?<br />
        <span className="text-or-fonce">Transmettez-la à la communauté.</span>
      </h1>
      <ul className="mt-8 flex w-full flex-col gap-3 text-left">
        {[
          ["30 secondes", "pour déposer une demande, puis la partager sur WhatsApp."],
          ["3 prestataires", "au maximum se positionnent : les mariés ne sont pas submergés."],
          ["Coordonnées protégées", "visibles seulement par les prestataires disponibles."],
          ["Suivi", "transmise, signée : chacun voit ce que deviennent ses demandes."],
        ].map(([titre, texte]) => (
          <li key={titre} className="rounded-carte bg-blanc px-5 py-4 ring-1 ring-or-clair/40">
            <span className="font-medium">{titre}</span> <span className="text-encre-doux">{texte}</span>
          </li>
        ))}
      </ul>
      <div className="mt-8 flex w-full flex-col gap-3">
        <BoutonLien href="/connexion">Se connecter ou rejoindre</BoutonLien>
      </div>
      <p className="mt-8 text-sm text-encre-doux">
        Réservé aux membres de{" "}
        {ZONES.map((z, i) => (
          <span key={z.code}>
            {i > 0 && " et "}
            <strong className="font-medium text-encre">{z.communaute}</strong> ({z.nom})
          </span>
        ))}
        . Chaque inscription est validée par l&apos;administration.
      </p>
      <Link href="/charte" className="mt-4 text-sm text-or-fonce underline underline-offset-4">Lire la charte d&apos;utilisation</Link>
    </main>
  );
}
