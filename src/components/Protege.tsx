"use client";
import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useEnLigne } from "@/lib/useEnLigne";
import { useSession } from "@/lib/useSession";

// N'affiche son contenu qu'aux personnes connectées.
// Sans réseau, on ne déconnecte pas : on affiche la dernière version enregistrée.
export function Protege({ children }: { children: ReactNode }) {
  const router = useRouter();
  const session = useSession();
  const enLigne = useEnLigne();

  useEffect(() => {
    if (session === null && enLigne) router.replace("/connexion");
  }, [session, enLigne, router]);

  if (session || (session === null && !enLigne)) return <>{children}</>;
  return <p className="mt-20 text-center text-encre-doux">Chargement…</p>;
}
