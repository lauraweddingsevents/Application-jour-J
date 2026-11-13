"use client";
import { useState } from "react";
import { Bouton } from "@/components/ui/Bouton";
import { Carte } from "@/components/ui/Carte";
import { Champ } from "@/components/ui/Champ";
import { creerJournee, modifierJournee, modifierMoment, supprimerJournee } from "@/lib/donnees";
import { decalerDeJours } from "@/lib/heures";
import { messageErreur } from "@/lib/erreurs";
import { jourLong } from "@/lib/jours";
import type { Journee, Mariage, Moment } from "@/lib/types";

const NOMS_SUGGERES = ["Welcome dinner", "Cérémonie civile", "Veille", "Brunch", "Pool party", "Mise en place", "Rangement"];

function decaler(dateIso: string, jours: number) {
  const d = new Date(`${dateIso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + jours);
  return d.toISOString().slice(0, 10);
}

// Ajouter, renommer ou supprimer les jours d'un mariage sur plusieurs jours
export function GestionJours({
  mariage,
  journees,
  moments,
  onModifie,
}: {
  mariage: Mariage;
  journees: Journee[];
  moments: Moment[];
  onModifie: (jourAffiche?: string) => Promise<void>;
}) {
  const dates = new Set([mariage.date_mariage, ...journees.map((j) => j.date_jour)]);
  // Date proposée : le lendemain du dernier jour, ou la veille s'il est déjà pris
  const dernier = [...dates].sort().at(-1)!;
  const [date, setDate] = useState(decaler(dernier, 1));
  const [titre, setTitre] = useState("");
  const [erreur, setErreur] = useState("");
  const [enCours, setEnCours] = useState(false);

  async function ajouter(e: React.FormEvent) {
    e.preventDefault();
    setErreur("");
    if (dates.has(date)) return setErreur("Ce jour fait déjà partie du mariage.");
    setEnCours(true);
    try {
      const j = await creerJournee(mariage.id, date, titre.trim() || null);
      setTitre("");
      setDate(decaler(date, 1));
      await onModifie(j.id);
    } catch (err) {
      setErreur(messageErreur(err as Error));
    } finally {
      setEnCours(false);
    }
  }

  const tries = [...journees].sort((a, b) => a.date_jour.localeCompare(b.date_jour));

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-encre-doux">
        Pour un mariage sur plusieurs jours : ajoutez la veille, le lendemain… Chaque
        jour a son propre déroulé, et un retard ne décale que le jour concerné.
      </p>

      <Carte className="py-4">
        <p className="text-xs text-encre-doux first-letter:uppercase">{jourLong(mariage.date_mariage)}</p>
        <p className="font-medium">Jour J</p>
        <p className="mt-1 text-xs text-encre-doux">La date du jour J se change dans l&apos;onglet « Réglages ».</p>
      </Carte>

      {tries.map((j) => (
        <LigneJour
          key={j.id}
          journee={j}
          fuseau={mariage.fuseau_horaire}
          moments={moments.filter((m) => m.journee_id === j.id)}
          datesPrises={dates}
          onModifie={onModifie}
        />
      ))}

      <form onSubmit={ajouter} className="flex flex-col gap-3 rounded-carte bg-blanc p-4 ring-1 ring-or-clair/60">
        <p className="font-medium">Ajouter un jour</p>
        <Champ id="dateJour" libelle="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        <Champ
          id="titreJour"
          libelle="Nom (facultatif)"
          placeholder="Welcome dinner, Brunch…"
          list="noms-jours"
          value={titre}
          onChange={(e) => setTitre(e.target.value)}
          autoComplete="off"
        />
        <datalist id="noms-jours">
          {NOMS_SUGGERES.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
        {erreur && <p className="text-sm text-alerte">{erreur}</p>}
        <Bouton type="submit" disabled={enCours}>
          {enCours ? "Ajout…" : "Ajouter ce jour"}
        </Bouton>
      </form>
    </div>
  );
}

function LigneJour({
  journee,
  fuseau,
  moments,
  datesPrises,
  onModifie,
}: {
  journee: Journee;
  fuseau: string;
  moments: Moment[];
  datesPrises: Set<string>;
  onModifie: (jourAffiche?: string) => Promise<void>;
}) {
  const [titre, setTitre] = useState(journee.titre ?? "");
  const [date, setDate] = useState(journee.date_jour);
  const [confirmer, setConfirmer] = useState(false);
  const [erreur, setErreur] = useState("");
  const nbMoments = moments.length;
  const modifie = titre !== (journee.titre ?? "") || date !== journee.date_jour;

  async function agir(action: () => Promise<void>) {
    setErreur("");
    try {
      await action();
    } catch (e) {
      const m = (e as Error).message;
      setErreur(m?.startsWith("Ce jour") ? m : messageErreur(e as Error));
    }
  }

  return (
    <Carte className="flex flex-col gap-3 py-4">
      <div className="grid grid-cols-2 gap-2">
        <Champ id={`date-${journee.id}`} libelle="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <Champ
          id={`titre-${journee.id}`}
          libelle="Nom"
          value={titre}
          onChange={(e) => setTitre(e.target.value)}
          placeholder="Brunch"
          autoComplete="off"
        />
      </div>
      {date !== journee.date_jour && nbMoments > 0 && (
        <p className="text-xs text-encre-doux">Ses {nbMoments} moments suivront, aux mêmes heures.</p>
      )}
      {modifie && (
        <Bouton
          variante="secondaire"
          onClick={() =>
            agir(async () => {
              if (date !== journee.date_jour && datesPrises.has(date)) throw new Error("Ce jour fait déjà partie du mariage.");
              await modifierJournee(journee.id, date, titre.trim() || null);
              // Nouvelle date : les moments du jour suivent, aux mêmes heures
              const ecart = Math.round((Date.parse(date) - Date.parse(journee.date_jour)) / 86_400_000);
              if (ecart) {
                await Promise.all(
                  moments.map((m) =>
                    modifierMoment(m.id, {
                      debut: decalerDeJours(m.debut, ecart, fuseau),
                      fin: m.fin ? decalerDeJours(m.fin, ecart, fuseau) : null,
                    }),
                  ),
                );
              }
              await onModifie();
            })
          }
        >
          Enregistrer
        </Bouton>
      )}
      {!confirmer ? (
        <button type="button" onClick={() => setConfirmer(true)} className="min-h-[40px] text-left text-sm text-encre-doux underline underline-offset-4">
          Supprimer ce jour
        </button>
      ) : (
        <div className="flex flex-col gap-2 rounded-2xl bg-creme p-3 text-sm">
          <p>
            {nbMoments > 0
              ? `Supprimer ce jour et ses ${nbMoments} moment${nbMoments > 1 ? "s" : ""} ?`
              : "Supprimer ce jour ?"}
          </p>
          <Bouton variante="danger" onClick={() => agir(async () => {
            await supprimerJournee(journee.id);
            await onModifie("jour-j");
          })}>
            Oui, supprimer
          </Bouton>
          <Bouton variante="discret" onClick={() => setConfirmer(false)}>
            Annuler
          </Bouton>
        </div>
      )}
      {erreur && <p className="text-sm text-alerte">{erreur}</p>}
    </Carte>
  );
}
