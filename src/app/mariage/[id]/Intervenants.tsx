"use client";
import { useCallback, useEffect, useState } from "react";
import { Bouton } from "@/components/ui/Bouton";
import { Carte } from "@/components/ui/Carte";
import { Feuille } from "@/components/ui/Feuille";
import {
  creerIntervenant,
  lirePreparation,
  listerIntervenants,
  type Preparation,
  modifierIntervenant,
  supprimerIntervenant,
} from "@/lib/donnees";
import { messageErreur } from "@/lib/erreurs";
import { ilYa } from "@/lib/temps";
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

  const [preparation, setPreparation] = useState<Preparation | null>(null);

  const charger = useCallback(() => {
    listerIntervenants(mariage.id)
      .then(setListe)
      .catch((e) => setErreur(messageErreur(e)));
    lirePreparation(mariage.id)
      .then(setPreparation)
      .catch(() => setPreparation(null));
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

      {preparation && liste && liste.length > 0 && (
        <QuiEstPret liste={liste} preparation={preparation} onRelancer={setPartage} onActualiser={charger} />
      )}

      {prestataires.length > 0 && (
        <Groupe titre={`Prestataires (${prestataires.length})`} liste={prestataires} onChoisir={setEdition} onPartager={setPartage} preparation={preparation} />
      )}
      {proches.length > 0 && (
        <Groupe titre={`Proches (${proches.length})`} liste={proches} onChoisir={setEdition} onPartager={setPartage} preparation={preparation} />
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
  preparation,
}: {
  titre: string;
  liste: Intervenant[];
  onChoisir: (i: Intervenant) => void;
  onPartager: (i: Intervenant) => void;
  preparation: Preparation | null;
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
                  {preparation && <Etat intervenant={i} preparation={preparation} />}
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

// Petites pastilles : lien ouvert ? alertes activées ?
function Etat({ intervenant, preparation }: { intervenant: Intervenant; preparation: Preparation }) {
  const visite = preparation.visites.get(intervenant.id);
  const alerte = preparation.alertes.get(intervenant.id);
  return (
    <span className="mt-1 flex flex-wrap gap-1 text-[11px] font-medium">
      {visite ? (
        <span className="rounded-full bg-succes/15 px-2 py-0.5 text-succes">
          ✓ Lien ouvert {ilYa(visite.derniere)}
        </span>
      ) : (
        <span className="rounded-full bg-alerte/10 px-2 py-0.5 text-alerte">Jamais ouvert</span>
      )}
      {alerte !== undefined && (
        <span className="rounded-full bg-or/15 px-2 py-0.5 text-or-fonce">🔔 Alertes {alerte} min</span>
      )}
    </span>
  );
}

// Résumé en haut de la liste : qui a ouvert son lien, qui a activé les alertes
function QuiEstPret({
  liste,
  preparation,
  onRelancer,
  onActualiser,
}: {
  liste: Intervenant[];
  preparation: Preparation;
  onRelancer: (i: Intervenant) => void;
  onActualiser: () => void;
}) {
  const ouverts = liste.filter((i) => preparation.visites.has(i.id));
  const alertes = liste.filter((i) => preparation.alertes.has(i.id));
  const enRetard = liste.filter((i) => !preparation.visites.has(i.id));
  const tousPrets = enRetard.length === 0;

  return (
    <section className="mt-5 rounded-carte bg-blanc p-4 ring-1 ring-or-clair/60" aria-label="Qui est prêt ?">
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-medium">Qui est prêt ?</h2>
        <button type="button" onClick={onActualiser} className="min-h-[36px] text-xs text-or-fonce underline underline-offset-4">
          Actualiser
        </button>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-center">
        <div className="rounded-2xl bg-creme p-3">
          <p className="text-2xl font-medium">
            {ouverts.length}
            <span className="text-base text-encre-doux">/{liste.length}</span>
          </p>
          <p className="text-xs text-encre-doux">ont ouvert leur lien</p>
        </div>
        <div className="rounded-2xl bg-creme p-3">
          <p className="text-2xl font-medium">
            {alertes.length}
            <span className="text-base text-encre-doux">/{liste.length}</span>
          </p>
          <p className="text-xs text-encre-doux">ont activé les alertes</p>
        </div>
      </div>
      {tousPrets ? (
        <p className="mt-3 text-sm text-succes">✓ Tout le monde a ouvert son lien.</p>
      ) : (
        <div className="mt-3">
          <p className="text-sm text-encre-doux">Pas encore ouvert — à relancer :</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {enRetard.map((i) => (
              <li key={i.id}>
                <button
                  type="button"
                  onClick={() => onRelancer(i)}
                  className="min-h-[40px] rounded-full bg-alerte/10 px-3 text-sm text-alerte"
                >
                  {i.nom} ↗
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
