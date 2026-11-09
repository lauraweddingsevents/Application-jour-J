"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bouton } from "@/components/ui/Bouton";
import { Carte } from "@/components/ui/Carte";
import { Logo } from "@/components/Logo";
import { supabaseNavigateur } from "@/lib/supabase/navigateur";
import { useSession } from "@/lib/useSession";

export function Tableau() {
  const router = useRouter();
  const session = useSession();

  // Pas connectée ? Retour à la page de connexion.
  useEffect(() => {
    if (session === null) router.replace("/connexion");
  }, [session, router]);

  if (!session) {
    return <p className="mt-20 text-center text-encre-doux">Chargement…</p>;
  }

  async function seDeconnecter() {
    await supabaseNavigateur().auth.signOut();
    router.replace("/");
  }

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-8">
      <header className="flex items-center justify-between">
        <Logo />
        <Bouton variante="discret" onClick={seDeconnecter} className="px-2">
          Se déconnecter
        </Bouton>
      </header>

      <h1 className="mt-10 text-2xl font-medium">Bonjour 👋</h1>
      <p className="mt-1 text-encre-doux">
        Compte : <strong>{session.user.email}</strong>
      </p>

      <Carte className="mt-8 text-center">
        <h2 className="font-medium">Vos mariages apparaîtront ici</h2>
        <p className="mt-2 text-sm text-encre-doux">
          La création des mariages arrive à la prochaine étape.
        </p>
      </Carte>
    </main>
  );
}
