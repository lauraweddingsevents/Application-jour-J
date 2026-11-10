"use client";
// Données affichées sur un lien personnel (/j/xxxx), gardées en mémoire sur
// le téléphone pour rester visibles sans réseau, et mises à jour en direct.
import { useCallback, useEffect, useRef, useState } from "react";
import { supabaseAnonyme } from "@/lib/supabase/anonyme";
import type { Categorie, CategorieFiche, Visibilite } from "@/lib/types";

export type MomentVue = {
  id: string;
  titre: string;
  debut: string;
  fin: string | null;
  lieu: string | null;
  notes: string | null;
  ordre: number;
  raccourci?: boolean;
  intervenants: string[];
};

export type Vue = {
  maintenant: string;
  mariage: {
    nom_marie_1: string;
    nom_marie_2: string;
    date_mariage: string;
    lieu_principal: string | null;
    fuseau_horaire: string;
    delai_alerte_defaut: number;
    canal: string;
  };
  moi: { id: string; nom: string; role: string | null; categorie: Categorie; acces_coordination: boolean };
  intervenants: { id: string; nom: string; role: string | null }[];
  moments: MomentVue[];
  fiche: {
    id: string;
    categorie: CategorieFiche;
    titre: string;
    contenu: string | null;
    telephone: string | null;
    adresse: string | null;
    visibilite: Visibilite;
  }[];
  annonces?: { id: string; texte: string; auteur: string | null; le: string }[];
};

type Memoire = { vue: Vue; chargeLe: number };
const cle = (jeton: string) => `macoordo:lien:${jeton}`;

function lireMemoire(jeton: string): Memoire | null {
  try {
    const brut = localStorage.getItem(cle(jeton));
    return brut ? (JSON.parse(brut) as Memoire) : null;
  } catch {
    return null;
  }
}

function ecrireMemoire(jeton: string, vue: Vue) {
  try {
    localStorage.setItem(cle(jeton), JSON.stringify({ vue, chargeLe: Date.now() }));
  } catch {
    // Mémoire du téléphone pleine ou bloquée : tant pis, on continue
  }
}

export type EtatVue =
  | { statut: "chargement" }
  | { statut: "introuvable" }
  | { statut: "erreur" }
  | { statut: "pret"; vue: Vue; chargeLe: number; horsLigne: boolean };

export function useVue(jeton: string) {
  const [etat, setEtat] = useState<EtatVue>({ statut: "chargement" });
  const [derniereMaj, setDerniereMaj] = useState<string[]>([]); // moments modifiés
  const precedente = useRef<Vue | null>(null);

  const charger = useCallback(async () => {
    const { data, error } = await supabaseAnonyme().rpc("vue_intervenant", { p_jeton: jeton });
    if (error) {
      // Pas de réseau (ou serveur injoignable) : on garde la dernière version connue
      const memoire = lireMemoire(jeton);
      setEtat((e) =>
        e.statut === "pret"
          ? { ...e, horsLigne: true }
          : memoire
            ? { statut: "pret", vue: memoire.vue, chargeLe: memoire.chargeLe, horsLigne: true }
            : { statut: "erreur" },
      );
      return;
    }
    if (!data) {
      setEtat({ statut: "introuvable" });
      return;
    }
    const vue = data as Vue;
    // Repère les moments dont l'horaire a changé, pour les signaler
    const avant = precedente.current;
    if (avant) {
      const changes = vue.moments
        .filter((m) => {
          const ancien = avant.moments.find((x) => x.id === m.id);
          return !ancien || ancien.debut !== m.debut || ancien.fin !== m.fin;
        })
        .map((m) => m.id);
      if (changes.length) setDerniereMaj(changes);
    }
    precedente.current = vue;
    ecrireMemoire(jeton, vue);
    setEtat({ statut: "pret", vue, chargeLe: Date.now(), horsLigne: false });
  }, [jeton]);

  // Affiche tout de suite la version gardée en mémoire, puis charge la nouvelle
  useEffect(() => {
    const memoire = lireMemoire(jeton);
    if (memoire) {
      precedente.current = memoire.vue;
      // Lecture de la mémoire du téléphone : possible seulement une fois la page affichée
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEtat({ statut: "pret", vue: memoire.vue, chargeLe: memoire.chargeLe, horsLigne: false });
    }
    charger();
  }, [jeton, charger]);

  // Mises à jour en direct + rechargement au retour du réseau ou de l'écran
  const canal = etat.statut === "pret" ? etat.vue.mariage.canal : null;
  useEffect(() => {
    if (!canal) return;
    let minuterie: ReturnType<typeof setTimeout> | undefined;
    const bientot = () => {
      clearTimeout(minuterie);
      minuterie = setTimeout(charger, 400); // regroupe les modifications en rafale
    };
    const supabase = supabaseAnonyme();
    const abonnement = supabase
      .channel(`mariage:${canal}`)
      .on("broadcast", { event: "maj" }, bientot)
      .subscribe((statut) => {
        // Reconnexion après une coupure : on recharge pour ne rien rater
        if (statut === "SUBSCRIBED") bientot();
      });
    const auRetour = () => document.visibilityState === "visible" && bientot();
    window.addEventListener("online", bientot);
    document.addEventListener("visibilitychange", auRetour);
    // Filet de sécurité : rechargement toutes les 2 minutes
    const intervalle = setInterval(bientot, 120_000);
    return () => {
      clearTimeout(minuterie);
      clearInterval(intervalle);
      window.removeEventListener("online", bientot);
      document.removeEventListener("visibilitychange", auRetour);
      supabase.removeChannel(abonnement);
    };
  }, [canal, charger]);

  // Hors ligne signalé par le téléphone
  useEffect(() => {
    const horsLigne = () => setEtat((e) => (e.statut === "pret" ? { ...e, horsLigne: true } : e));
    window.addEventListener("offline", horsLigne);
    return () => window.removeEventListener("offline", horsLigne);
  }, []);

  return { etat, derniereMaj, effacerMaj: () => setDerniereMaj([]), recharger: charger };
}

// Heure actuelle, rafraîchie toutes les 30 secondes
export function useMaintenant(intervalleMs = 30_000) {
  const [maintenant, setMaintenant] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setMaintenant(Date.now()), intervalleMs);
    return () => clearInterval(id);
  }, [intervalleMs]);
  return maintenant;
}

// Fin effective d'un moment : sa fin, sinon le début du suivant, sinon +30 min
export function finEffective(m: MomentVue, tous: MomentVue[]) {
  if (m.fin) return new Date(m.fin).getTime();
  const debut = new Date(m.debut).getTime();
  const suivant = tous.map((x) => new Date(x.debut).getTime()).filter((t) => t > debut).sort((a, b) => a - b)[0];
  return suivant ?? debut + 30 * 60_000;
}

// Annonces pas encore vues sur ce téléphone (seulement celles des 2 dernières heures)
export function useAnnoncesNonLues(jeton: string, annonces: NonNullable<Vue["annonces"]>, maintenant: number) {
  const cleVues = `macoordo:annonces-vues:${jeton}`;
  const [vues, setVues] = useState<string[] | null>(null);

  useEffect(() => {
    try {
      // Lecture de la mémoire du téléphone : possible seulement une fois la page affichée
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVues(JSON.parse(localStorage.getItem(cleVues) ?? "[]"));
    } catch {
      setVues([]);
    }
  }, [cleVues]);

  const limite = maintenant - 2 * 3_600_000;
  const nouvelle =
    vues === null
      ? undefined
      : annonces.find((a) => !vues.includes(a.id) && new Date(a.le).getTime() > limite);

  // Vibration à l'arrivée d'une nouvelle annonce
  const derniere = useRef<string | null>(null);
  useEffect(() => {
    if (nouvelle && derniere.current !== nouvelle.id) {
      derniere.current = nouvelle.id;
      navigator.vibrate?.([200, 100, 200]);
    }
  }, [nouvelle]);

  return {
    nouvelle,
    vue: () => {
      const toutes = [...new Set([...(vues ?? []), ...annonces.map((a) => a.id)])].slice(-50);
      setVues(toutes);
      try {
        localStorage.setItem(cleVues, JSON.stringify(toutes));
      } catch {}
    },
  };
}
