"use client";
import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useEnLigne } from "@/lib/useEnLigne";
import { useSession } from "@/lib/useSession";
import { lireProfil } from "@/lib/plans";

// N'affiche son contenu qu'aux personnes connectées.
// Sans réseau, on ne déconnecte pas : on affiche la dernière version enregistrée.
// Un compte qui n'a pas encore choisi son type (mariés, lieu…) passe par /bienvenue.
export function Protege({
  children,
  connexion = "/connexion",
  verifierType = true,
}: {
  children: ReactNode;
  connexion?: string;
  verifierType?: boolean;
}) {
  const router = useRouter();
  const session = useSession();
  const enLigne = useEnLigne();

  useEffect(() => {
    if (session === null && enLigne) {
      const ici = window.location.pathname + window.location.search;
      router.replace(`${connexion}?suite=${encodeURIComponent(ici)}`);
    }
  }, [session, enLigne, router, connexion]);

  useEffect(() => {
    if (!session || !verifierType) return;
    lireProfil()
      .then((p) => {
        if (p && !p.type_compte) {
          const ici = window.location.pathname + window.location.search;
          router.replace(`/bienvenue?suite=${encodeURIComponent(ici)}`);
        }
      })
      .catch(() => {});
  }, [session, verifierType, router]);

  if (session || (session === null && !enLigne)) return <>{children}</>;
  return <p className="mt-20 text-center text-encre-doux">Chargement…</p>;
}
