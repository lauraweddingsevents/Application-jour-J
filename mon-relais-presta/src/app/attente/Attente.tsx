"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { Bouton, BoutonLien } from "@/components/ui/Bouton";
import { Carte } from "@/components/ui/Carte";
import { Chargement } from "@/components/Garde";
import { useMembre } from "@/lib/membre";
import { supabaseNavigateur } from "@/lib/supabase/navigateur";

const TEXTES = {
  en_attente: {
    titre: "Merci, votre inscription est bien reçue",
    texte: "L'administration va la vérifier. Vous recevrez un e-mail dès qu'elle sera validée.",
  },
  refuse: {
    titre: "Votre inscription n'a pas été validée",
    texte: "Vous pouvez corriger votre fiche et la renvoyer, ou contacter l'administration de votre communauté.",
  },
  suspendu: {
    titre: "Votre compte est suspendu",
    texte: "Pour en savoir plus, contactez l'administration de votre communauté.",
  },
} as const;

// Page vue par les membres qui ne sont pas (ou plus) validés
export function Attente() {
  const router = useRouter();
  const { session, membre, recharger } = useMembre();

  useEffect(() => {
    if (session === null) router.replace("/connexion");
    else if (session && membre === null) router.replace("/inscription");
    else if (membre?.statut === "valide") router.replace("/demandes");
  }, [session, membre, router]);

  if (!membre || membre.statut === "valide") return <Chargement />;
  const t = TEXTES[membre.statut];

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center px-4 py-14 text-center">
      <Logo taille="grand" />
      <Carte className="mt-10 flex w-full flex-col gap-4">
        <p className="text-3xl" aria-hidden>{membre.statut === "en_attente" ? "⏳" : "✋"}</p>
        <h1 className="text-xl font-medium">{t.titre}</h1>
        <p className="text-encre-doux">{t.texte}</p>
        {membre.statut === "en_attente" && (
          <Bouton variante="secondaire" onClick={() => recharger()}>Vérifier à nouveau</Bouton>
        )}
        {membre.statut === "refuse" && <BoutonLien href="/inscription">Modifier ma fiche</BoutonLien>}
      </Carte>
      <Bouton
        variante="discret"
        className="mt-6"
        onClick={async () => {
          await supabaseNavigateur().auth.signOut();
          router.replace("/");
        }}
      >
        Me déconnecter
      </Bouton>
    </main>
  );
}
