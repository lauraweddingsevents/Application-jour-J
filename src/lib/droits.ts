"use client";
// Droits du compte (commun à Ma Coordo et Ma Visite Technique) :
// essai, abonnement, compte suspendu, administratrice.
import { useEffect, useState } from "react";
import { supabaseNavigateur } from "@/lib/supabase/navigateur";
import { avecMemoire } from "@/lib/memoire";

export type Droits = {
  peut_modifier: boolean;
  raison: "admin" | "lancement" | "abonne" | "essai" | "expire" | "suspendu" | "inconnu";
  est_admin?: boolean;
  fin_essai?: string | null;
  abonnement_statut?: string;
  abonnement_fin?: string | null;
  paiement_actif?: boolean;
  prix_affiche?: string;
};

export async function chargerDroits(): Promise<Droits | null> {
  return avecMemoire("droits", async () => {
    const { data, error } = await supabaseNavigateur().rpc("mes_droits");
    // Fonction absente (script commun pas encore installé) : accès complet comme avant
    if (error) return null;
    return data as Droits;
  });
}

/** undefined = en cours de lecture, null = inconnu (accès complet) */
export function useDroits() {
  const [droits, setDroits] = useState<Droits | null | undefined>(undefined);
  useEffect(() => {
    chargerDroits()
      .then(setDroits)
      .catch(() => setDroits(null));
  }, []);
  return droits;
}

export const peutModifier = (d: Droits | null | undefined) => d?.peut_modifier !== false;
