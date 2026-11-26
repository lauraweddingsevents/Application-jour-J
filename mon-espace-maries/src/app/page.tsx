"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePersonne } from "@/lib/session";
import { Chargement } from "@/components/ui";

// Aiguillage : Laura vers l'administration, les mariés vers leur espace
export default function Accueil() {
  const router = useRouter();
  const { session, personne } = usePersonne();

  useEffect(() => {
    if (session === null || personne === null) router.replace("/connexion");
    else if (personne?.role === "admin") router.replace("/admin");
    else if (personne?.role === "marie") router.replace("/espace");
  }, [session, personne, router]);

  return <Chargement />;
}
