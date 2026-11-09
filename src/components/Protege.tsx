"use client";
import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/useSession";

// N'affiche son contenu qu'aux personnes connectées
export function Protege({ children }: { children: ReactNode }) {
  const router = useRouter();
  const session = useSession();

  useEffect(() => {
    if (session === null) router.replace("/connexion");
  }, [session, router]);

  if (!session) {
    return <p className="mt-20 text-center text-encre-doux">Chargement…</p>;
  }
  return <>{children}</>;
}
