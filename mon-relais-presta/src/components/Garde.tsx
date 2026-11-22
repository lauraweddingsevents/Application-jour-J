"use client";
import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useMembre } from "@/lib/membre";
import { AccepterCharte } from "@/components/AccepterCharte";

// N'affiche son contenu qu'aux membres validés (et, si demandé, à l'administration).
// Sinon : connexion, inscription ou page d'attente selon le cas.
export function Garde({ children, admin = false }: { children: ReactNode; admin?: boolean }) {
  const router = useRouter();
  const { session, membre, charteVersion } = useMembre();

  useEffect(() => {
    const ici = window.location.pathname + window.location.search;
    if (session === null) router.replace(`/connexion?suite=${encodeURIComponent(ici)}`);
    else if (session && membre === null) router.replace(`/inscription?suite=${encodeURIComponent(ici)}`);
    else if (membre && membre.statut !== "valide") router.replace("/attente");
  }, [session, membre, router]);

  if (!membre || membre.statut !== "valide") return <Chargement />;
  if (charteVersion && membre.charte_version < charteVersion) return <AccepterCharte />;
  if (admin && membre.role !== "admin")
    return <p className="mt-20 px-4 text-center text-encre-doux">Cette page est réservée à l&apos;administration.</p>;
  return <>{children}</>;
}

export function Chargement() {
  return <p className="mt-20 text-center text-encre-doux">Chargement…</p>;
}
