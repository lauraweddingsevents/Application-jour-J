"use client";
// Mémoire « annuler / rétablir » du plan en cours de modification
import { useCallback, useRef, useState } from "react";
import type { PlanContenu } from "@/plan/types";

const MAX = 100;

type Etat = { passe: PlanContenu[]; present: PlanContenu; futur: PlanContenu[] };

export function useHistorique(initial: PlanContenu) {
  const [etat, setEtat] = useState<Etat>({ passe: [], present: initial, futur: [] });
  const derniere = useRef<{ cle: string; quand: number } | null>(null);
  const [modifie, setModifie] = useState(0); // augmente à chaque modification locale

  // Modification qui peut être annulée. « cle » regroupe les petites
  // modifications successives d'un même champ (ex. taper « 180 » au clavier).
  const modifier = useCallback((fn: (c: PlanContenu) => PlanContenu, cle?: string) => {
    const maintenant = Date.now();
    const regrouper = !!cle && derniere.current?.cle === cle && maintenant - derniere.current.quand < 1200;
    derniere.current = cle ? { cle, quand: maintenant } : null;
    setEtat((e) => ({
      passe: regrouper ? e.passe : [...e.passe.slice(-MAX + 1), e.present],
      present: fn(e.present),
      futur: [],
    }));
    setModifie((n) => n + 1);
  }, []);

  // Pendant un glisser-déposer : on montre le mouvement sans encombrer l'historique…
  const apercu = useCallback((fn: (c: PlanContenu) => PlanContenu) => {
    setEtat((e) => ({ ...e, present: fn(e.present) }));
  }, []);
  // … puis on enregistre une seule étape à la fin du geste
  const valider = useCallback((avant: PlanContenu) => {
    derniere.current = null;
    setEtat((e) => (e.present === avant ? e : { passe: [...e.passe.slice(-MAX + 1), avant], present: e.present, futur: [] }));
    setModifie((n) => n + 1);
  }, []);

  const annuler = useCallback(() => {
    derniere.current = null;
    setEtat((e) => (e.passe.length ? { passe: e.passe.slice(0, -1), present: e.passe.at(-1)!, futur: [e.present, ...e.futur] } : e));
    setModifie((n) => n + 1);
  }, []);
  const retablir = useCallback(() => {
    derniere.current = null;
    setEtat((e) => (e.futur.length ? { passe: [...e.passe, e.present], present: e.futur[0], futur: e.futur.slice(1) } : e));
    setModifie((n) => n + 1);
  }, []);

  // Nouvelle version reçue d'ailleurs (autre appareil, restauration) : on repart de zéro
  const remplacer = useCallback((c: PlanContenu) => {
    derniere.current = null;
    setEtat({ passe: [], present: c, futur: [] });
  }, []);

  return {
    contenu: etat.present,
    peutAnnuler: etat.passe.length > 0,
    peutRetablir: etat.futur.length > 0,
    modifie,
    modifier,
    apercu,
    valider,
    annuler,
    retablir,
    remplacer,
  };
}
