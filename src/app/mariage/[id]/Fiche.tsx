"use client";
import { useCallback, useEffect, useState } from "react";
import { AffichageFiche } from "@/components/fiche/AffichageFiche";
import { Bouton } from "@/components/ui/Bouton";
import { Carte } from "@/components/ui/Carte";
import { Feuille } from "@/components/ui/Feuille";
import {
  creerElementFiche,
  listerFiche,
  listerIntervenants,
  modifierElementFiche,
  supprimerElementFiche,
} from "@/lib/donnees";
import { messageErreur } from "@/lib/erreurs";
import type { ElementFiche, Intervenant, Mariage } from "@/lib/types";
import { FormulaireFiche } from "./FormulaireFiche";

export function Fiche({ mariage }: { mariage: Mariage }) {
  const [elements, setElements] = useState<ElementFiche[] | null>(null);
  const [intervenants, setIntervenants] = useState<Intervenant[]>([]);
  const [erreur, setErreur] = useState("");
  const [edition, setEdition] = useState<ElementFiche | "nouveau" | null>(null);
  const fermer = useCallback(() => setEdition(null), []);

  const charger = useCallback(
    () =>
      Promise.all([listerFiche(mariage.id), listerIntervenants(mariage.id)])
        .then(([f, i]) => {
          setElements(f);
          setIntervenants(i);
        })
        .catch((e) => setErreur(messageErreur(e))),
    [mariage.id],
  );
  useEffect(() => {
    charger();
  }, [charger]);

  return (
    <div>
      <Bouton className="w-full" onClick={() => setEdition("nouveau")}>
        <span aria-hidden className="text-xl leading-none">+</span> Ajouter une information
      </Bouton>
      <p className="mt-3 text-sm text-encre-doux">
        Contacts, adresses, plan B météo, codes d&apos;accès… Tout ce que les
        intervenants doivent avoir sous la main.
      </p>

      {erreur && <p className="mt-4 text-alerte">{erreur}</p>}
      {elements === null && !erreur && <p className="mt-8 text-center text-encre-doux">Chargement…</p>}
      {elements?.length === 0 && (
        <Carte className="mt-4 text-center">
          <p className="text-3xl" aria-hidden>📋</p>
          <p className="mt-2 text-encre-doux">La fiche pratique est vide pour l&apos;instant.</p>
        </Carte>
      )}
      {elements && elements.length > 0 && (
        <div className="mt-6">
          <AffichageFiche
            elements={elements}
            montrerVisibilite
            onChoisir={(id) => setEdition(elements.find((e) => e.id === id) ?? null)}
          />
        </div>
      )}

      <Feuille
        titre={edition === "nouveau" ? "Nouvelle information" : "Modifier l'information"}
        ouverte={edition !== null}
        onFermer={fermer}
      >
        {edition !== null && (
          <FormulaireFiche
            key={edition === "nouveau" ? "nouveau" : edition.id}
            intervenants={intervenants}
            initial={edition === "nouveau" ? undefined : edition}
            onEnregistrer={async (saisie) => {
              if (edition === "nouveau") await creerElementFiche(mariage.id, saisie, elements?.length ?? 0);
              else await modifierElementFiche(edition.id, saisie);
              await charger();
              fermer();
            }}
            onSupprimer={
              edition === "nouveau"
                ? undefined
                : async () => {
                    await supprimerElementFiche(edition.id);
                    await charger();
                    fermer();
                  }
            }
          />
        )}
      </Feuille>
    </div>
  );
}
