"use client";
import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { usePersonne } from "@/lib/session";
import { FournisseurEspace } from "@/lib/espace";
import { CoquilleMaries } from "@/components/CoquilleMaries";
import { BoutonLien, Chargement } from "@/components/ui";

// Espace mariés : réservé aux mariés connectés (Laura passe par l'administration)
export default function LayoutEspace({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { session, personne } = usePersonne();

  useEffect(() => {
    if (session === null || personne === null) router.replace(`/connexion?suite=${encodeURIComponent(window.location.pathname)}`);
    else if (personne?.role === "admin") router.replace("/admin");
  }, [session, personne, router]);

  if (!personne || personne.role !== "marie" || !personne.couple_id) return <Chargement />;

  return (
    <FournisseurEspace
      coupleId={personne.couple_id}
      moi={personne}
      admin={false}
      base="/espace"
      lien={(partie) => (partie ? `/espace/${partie}` : "/espace")}
      chargement={<Chargement />}
      introuvable={
        <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-6 py-20 text-center">
          <p>Votre espace n&apos;est plus disponible.</p>
          <BoutonLien href="/connexion">Retour</BoutonLien>
        </div>
      }
    >
      <CoquilleMaries>{children}</CoquilleMaries>
    </FournisseurEspace>
  );
}
