"use client";
import { useCallback, useEffect, useState } from "react";
import { Bouton } from "@/components/ui/Bouton";
import { Carte } from "@/components/ui/Carte";
import { Feuille } from "@/components/ui/Feuille";
import {
  creerIntervenant,
  listerIntervenants,
  modifierIntervenant,
  supprimerIntervenant,
} from "@/lib/donnees";
import { messageErreur } from "@/lib/erreurs";
import type { Intervenant, Mariage } from "@/lib/types";
import { FormulaireIntervenant } from "./FormulaireIntervenant";
import { Partage } from "./Partage";

export function Intervenants({ mariage }: { mariage: Mariage }) {
  const [liste, setListe] = useState<Intervenant[] | null>(null);
  const [erreur, setErreur] = useState("");
  // null = fermé, "nouveau" = création, sinon l'intervenant à modifier
  const [edition, setEdition] = useState<Intervenant | "nouveau" | null>(null);
  const [partage, setPartage] = useState<Intervenant | null>(null);
  const fermer = useCallback(() => setEdition(null), []);
  const fermerPartage = useCallback(() => setPartage(null), []);

  const charger = useCallback(() => {
    listerIntervenants(mariage.id)
      .then(setListe)
      .catch((e) => setErreur(messageErreur(e)));
  }, [mariage.id]);
  useEffect(charger, [charger]);

  const prestataires = (liste ?? []).filter((i) => i.categorie === "prestataire");
  const proches = (liste ?? []).filter((i) => i.categorie === "proche");

  return (
    <div>
      <Bouton className="w-full" onClick={() => setEdition("nouveau")}>
        <span aria-hidden className="text-xl leading-none">+</span> Ajouter un intervenant
      </Bouton>

      {erreur && <p className="mt-4 text-alerte">{erreur}</p>}
      {liste === null && !erreur && (
        <p className="mt-8 text-center text-encre-doux">Chargement…</p>
      )}
      {liste?.length === 0 && (
        <Carte className="mt-4 text-center">
          <p className="text-encre-doux">
            Ajoutez les prestataires et les proches qui ont une mission ce
            jour-là. Chacun recevra son lien personnel.
          </p>
        </Carte>
      )}

      {prestataires.length > 0 && (
        <Groupe titre={`Prestataires (${prestataires.length})`} liste={prestataires} onChoisir={setEdition} onPartager={setPartage} />
      )}
      {proches.length > 0 && (
        <Groupe titre={`Proches (${proches.length})`} liste={proches} onChoisir={setEdition} onPartager={setPartage} />
      )}

      <Feuille titre="Envoyer son lien" ouverte={partage !== null} onFermer={fermerPartage}>
        {partage && <Partage intervenant={partage} mariage={mariage} />}
      </Feuille>

      <Feuille
        titre={edition === "nouveau" ? "Nouvel intervenant" : "Modifier l'intervenant"}
        ouverte={edition !== null}
        onFermer={fermer}
      >
        {edition === "nouveau" && (
          <FormulaireIntervenant
            onEnregistrer={async (saisie) => {
              const nouvel = await creerIntervenant(mariage.id, saisie, liste?.length ?? 0);
              setListe((l) => [...(l ?? []), nouvel]);
              fermer();
            }}
          />
        )}
        {edition && edition !== "nouveau" && (
          <FormulaireIntervenant
            key={edition.id}
            initial={{
              nom: edition.nom,
              role: edition.role,
              categorie: edition.categorie,
              telephone: edition.telephone,
              email: edition.email,
              acces_coordination: edition.acces_coordination,
            }}
            onEnregistrer={async (saisie) => {
              const maj = await modifierIntervenant(edition.id, saisie);
              setListe((l) => (l ?? []).map((x) => (x.id === maj.id ? maj : x)));
              fermer();
            }}
            onSupprimer={async () => {
              await supprimerIntervenant(edition.id);
              setListe((l) => (l ?? []).filter((x) => x.id !== edition.id));
              fermer();
            }}
          />
        )}
      </Feuille>
    </div>
  );
}

function Groupe({
  titre,
  liste,
  onChoisir,
  onPartager,
}: {
  titre: string;
  liste: Intervenant[];
  onChoisir: (i: Intervenant) => void;
  onPartager: (i: Intervenant) => void;
}) {
  return (
    <section className="mt-6">
      <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-encre-doux">{titre}</h2>
      <ul className="flex flex-col gap-2">
        {liste.map((i) => (
          <li key={i.id}>
            <Carte className="flex items-center gap-3 py-3">
              <button
                type="button"
                onClick={() => onChoisir(i)}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
                aria-label={`Modifier ${i.nom}`}
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-creme font-medium text-or-fonce">
                  {i.nom.trim().charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{i.nom}</span>
                  <span className="block truncate text-sm text-encre-doux">
                    {i.role || "Rôle non précisé"}
                    {i.acces_coordination && " · Coordination"}
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => onPartager(i)}
                className="min-h-[44px] shrink-0 rounded-full bg-or px-4 text-sm font-medium text-blanc"
              >
                Lien ↗
              </button>
            </Carte>
          </li>
        ))}
      </ul>
    </section>
  );
}
