"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Langue } from "@/lib/calculs";
import { dico, type Dictionnaire } from "@/lib/i18n";
import { estCoordination, type Couple, type Droits, type Personne } from "@/lib/types";
import { supabaseNavigateur } from "@/lib/supabase/navigateur";
import { messageErreur } from "@/lib/erreurs";

// Tout ce dont un écran d'un espace a besoin : le couple, qui regarde, ses droits, la langue.
// Utilisé à l'identique par l'espace mariés et par la fiche couple de l'administration.
export type Espace = {
  couple: Couple;
  maries: Personne[];
  moi: Personne | null;        // le marié connecté (null pour Laura)
  droits: Droits;
  langue: Langue;
  t: Dictionnaire;
  base: string;                // « /espace » ou « /admin/couple/<id> »
  lien: (partie: string) => string;
  rechargerCouple: () => Promise<void>;
};

const Contexte = createContext<Espace | null>(null);

export function FournisseurEspace({
  coupleId, moi, admin, base, lien, children, chargement, introuvable,
}: {
  coupleId: string;
  moi: Personne | null;
  admin: boolean;
  base: string;
  lien: (partie: string) => string;
  children: ReactNode;
  chargement: ReactNode;
  introuvable: ReactNode;
}) {
  const [couple, setCouple] = useState<Couple | null | undefined>(undefined);
  const [maries, setMaries] = useState<Personne[]>([]);

  const rechargerCouple = useCallback(async () => {
    const supabase = supabaseNavigateur();
    const [c, p] = await Promise.all([
      supabase.from("couples").select("*").eq("id", coupleId).maybeSingle(),
      supabase.from("personnes").select("id, role, couple_id, prenom, email, telephone, user_id, derniere_connexion").eq("couple_id", coupleId).order("cree_le"),
    ]);
    setCouple((c.data as Couple | null) ?? null);
    setMaries((p.data as Personne[]) ?? []);
  }, [coupleId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    rechargerCouple().catch(() => setCouple(null));
  }, [rechargerCouple]);

  if (couple === undefined) return <>{chargement}</>;
  if (couple === null) return <>{introuvable}</>;

  // L'administration est toujours en français ; l'espace mariés dans la langue du couple
  const langue: Langue = admin ? "fr" : couple.langue;
  const valeur: Espace = {
    couple,
    maries,
    moi,
    droits: { admin, editer: admin || estCoordination(couple.formule) },
    langue,
    t: dico(langue),
    base,
    lien,
    rechargerCouple,
  };
  return <Contexte.Provider value={valeur}>{children}</Contexte.Provider>;
}

export function useEspace() {
  const e = useContext(Contexte);
  if (!e) throw new Error("FournisseurEspace manquant");
  return e;
}

// Charge des données depuis Supabase et permet de les recharger après une modification
export function useDonnees<T>(charger: () => Promise<T>, cles: unknown[]) {
  const [donnees, setDonnees] = useState<T | undefined>(undefined);
  const [erreur, setErreur] = useState("");
  const chargeur = useRef(charger);
  useEffect(() => {
    chargeur.current = charger;
  });

  const recharger = useCallback(async () => {
    try {
      setDonnees(await chargeur.current());
      setErreur("");
    } catch (e) {
      setErreur(messageErreur(e as Error));
    }
  }, []);

  useEffect(() => {
    recharger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, cles);

  return { donnees, erreur, recharger, setDonnees };
}

type Requete = PromiseLike<{ error: { message: string; code?: string } | null }>;

// Exécute une modification, affiche l'erreur éventuelle, prévient le serveur, recharge l'écran
export function useAgir(recharger: () => Promise<void>, langue: Langue, apres?: () => void) {
  const [erreurAction, setErreurAction] = useState("");
  const agir = useCallback(
    async (action: () => Requete) => {
      setErreurAction("");
      const { error } = await action();
      if (error) setErreurAction(messageErreur(error, langue));
      else apres?.();
      await recharger();
      return !error;
    },
    [recharger, langue, apres],
  );
  return { agir, erreurAction, setErreurAction };
}

// Lance une requête Supabase et lève l'erreur éventuelle
export async function exiger<T>(requete: PromiseLike<{ data: T; error: { message: string; code?: string } | null }>): Promise<T> {
  const { data, error } = await requete;
  if (error) throw error;
  return data;
}
