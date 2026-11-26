"use client";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabaseNavigateur } from "@/lib/supabase/navigateur";
import { useSession } from "@/lib/useSession";
import type { Personne } from "@/lib/types";

type Etat = {
  session: Session | null | undefined;
  // undefined = chargement ; null = pas connecté(e) ou compte inconnu
  personne: Personne | null | undefined;
  recharger: () => Promise<void>;
};

const Contexte = createContext<Etat | null>(null);

// Garde en mémoire la personne connectée (Laura ou un marié)
export function FournisseurSession({ children }: { children: ReactNode }) {
  const session = useSession();
  const [personne, setPersonne] = useState<Personne | null | undefined>(undefined);

  const recharger = useCallback(async () => {
    const supabase = supabaseNavigateur();
    const { data: s } = await supabase.auth.getSession();
    if (!s.session) return setPersonne(null);
    const { data } = await supabase
      .from("personnes")
      .select("id, role, couple_id, prenom, email, telephone, user_id, derniere_connexion")
      .eq("user_id", s.session.user.id)
      .maybeSingle();
    setPersonne((data as Personne | null) ?? null);
  }, []);

  useEffect(() => {
    if (session === undefined) return;
    // Chargement de la fiche à chaque changement de connexion
    // eslint-disable-next-line react-hooks/set-state-in-effect
    recharger().catch(() => setPersonne(null));
  }, [session, recharger]);

  return (
    <Contexte.Provider value={{ session, personne: session === null ? null : personne, recharger }}>
      {children}
    </Contexte.Provider>
  );
}

export function usePersonne() {
  const etat = useContext(Contexte);
  if (!etat) throw new Error("FournisseurSession manquant");
  return etat;
}

export async function seDeconnecter() {
  await supabaseNavigateur().auth.signOut();
  // Rechargement complet volontaire : efface tout ce qui était affiché de l'espace
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.href = "/connexion";
}
