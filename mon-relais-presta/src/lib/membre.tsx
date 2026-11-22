"use client";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabaseNavigateur } from "@/lib/supabase/navigateur";
import { useSession } from "@/lib/useSession";
import { COLONNES_MEMBRE, type Membre, type Metier } from "@/lib/types";

type Etat = {
  session: Session | null | undefined;
  // undefined = chargement ; null = connecté(e) mais pas encore inscrit(e)
  membre: Membre | null | undefined;
  metiers: Metier[];
  charteVersion: number | null;
  recharger: () => Promise<void>;
};

const Contexte = createContext<Etat | null>(null);

// Garde en mémoire la personne connectée, sa fiche membre et la liste des métiers
export function FournisseurMembre({ children }: { children: ReactNode }) {
  const session = useSession();
  const [membre, setMembre] = useState<Membre | null | undefined>(undefined);
  const [metiers, setMetiers] = useState<Metier[]>([]);
  const [charteVersion, setCharteVersion] = useState<number | null>(null);

  const recharger = useCallback(async () => {
    const supabase = supabaseNavigateur();
    const [m, c] = await Promise.all([
      supabase.from("metiers").select("id, nom, ordre, actif").order("ordre").order("nom"),
      supabase.from("charte").select("version").eq("id", 1).maybeSingle(),
    ]);
    setMetiers((m.data as Metier[]) ?? []);
    setCharteVersion(c.data?.version ?? null);

    const { data: s } = await supabase.auth.getSession();
    if (!s.session) return setMembre(null);
    const { data } = await supabase.from("membres").select(COLONNES_MEMBRE).eq("id", s.session.user.id).maybeSingle();
    setMembre((data as Membre | null) ?? null);
  }, []);

  useEffect(() => {
    if (session === undefined) return;
    // Chargement des données distantes à chaque changement de connexion
    // eslint-disable-next-line react-hooks/set-state-in-effect
    recharger().catch(() => setMembre(null));
  }, [session, recharger]);

  return (
    <Contexte.Provider value={{ session, membre: session === null ? null : membre, metiers, charteVersion, recharger }}>
      {children}
    </Contexte.Provider>
  );
}

export function useMembre() {
  const etat = useContext(Contexte);
  if (!etat) throw new Error("FournisseurMembre manquant");
  return etat;
}

export function nomMetier(metiers: Metier[], id: number | null | undefined) {
  return metiers.find((m) => m.id === id)?.nom ?? "";
}
