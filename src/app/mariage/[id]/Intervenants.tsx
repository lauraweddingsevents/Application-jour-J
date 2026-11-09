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

export function Intervenants({ mariage }: { mariage: Mariage }) {
  const [liste, setListe] = useState<Intervenant[] | null>(null);
  const [erreur, setErreur] = useState("");
  // null = fermé, "nouveau" = création, sinon l'intervenant à modifier
  const [edition, setEdition] = useState<Intervenant | "nouveau" | null>(null);
  const fermer = useCallback(() => setEdition(null), []);

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
        <Groupe titre={`Prestataires (${prestataires.length})`} liste={prestataires} onChoisir={setEdition} />
      )}
      {proches.length > 0 && (
        <Groupe titre={`Proches (${proches.length})`} liste={proches} onChoisir={setEdition} />
      )}

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
}: {
  titre: string;
  liste: Intervenant[];
  onChoisir: (i: Intervenant) => void;
}) {
  return (
    <section className="mt-6">
      <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-encre-doux">{titre}</h2>
      <ul className="flex flex-col gap-2">
        {liste.map((i) => (
          <li key={i.id}>
            <button type="button" onClick={() => onChoisir(i)} className="w-full text-left">
              <Carte className="flex items-center gap-4 py-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-creme font-medium text-or-fonce">
                  {i.nom.trim().charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{i.nom}</span>
                  <span className="block truncate text-sm text-encre-doux">
                    {i.role || "Rôle non précisé"}
                    {i.telephone && " · 📞"}
                  </span>
                </span>
                {i.acces_coordination && (
                  <span className="shrink-0 rounded-full bg-or/15 px-2.5 py-1 text-xs font-medium text-or-fonce">
                    Coordination
                  </span>
                )}
                <span aria-hidden className="text-encre-doux">›</span>
              </Carte>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
