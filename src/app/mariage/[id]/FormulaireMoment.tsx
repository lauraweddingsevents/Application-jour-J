"use client";
import { useState } from "react";
import { Bouton } from "@/components/ui/Bouton";
import { Champ } from "@/components/ui/Champ";
import { Choix } from "@/components/ui/Choix";
import { Selecteur } from "@/components/ui/Selecteur";
import { ZoneTexte } from "@/components/ui/ZoneTexte";
import { messageErreur } from "@/lib/erreurs";
import { ajouterMinutes, dureeLisible, heureSaisie, minutesEntre, versInstant } from "@/lib/heures";
import type { MomentSaisi } from "@/lib/donnees";
import type { Intervenant, Mariage, Moment } from "@/lib/types";

const TITRES_SUGGERES = [
  "Préparatifs de la mariée",
  "Préparatifs du marié",
  "First look",
  "Arrivée des invités",
  "Cérémonie civile",
  "Cérémonie religieuse",
  "Cérémonie laïque",
  "Sortie des mariés",
  "Photo de groupe",
  "Séance photo de couple",
  "Vin d'honneur",
  "Cocktail",
  "Installation des invités en salle",
  "Entrée des mariés",
  "Dîner",
  "Discours des témoins",
  "Ouverture de bal",
  "Pièce montée",
  "Soirée dansante",
  "Buffet de nuit",
  "Fin de soirée",
];

const DUREES = [5, 10, 15, 20, 30, 45, 60, 75, 90, 120, 150, 180, 240, 300];

type ModeFin = "duree" | "heure" | "aucune";

export function FormulaireMoment({
  mariage,
  intervenants,
  lieuxConnus,
  initial,
  heureProposee,
  onEnregistrer,
  onSupprimer,
}: {
  mariage: Mariage;
  intervenants: Intervenant[];
  lieuxConnus: string[];
  initial?: Moment;
  heureProposee?: string;
  onEnregistrer: (m: MomentSaisi) => Promise<void>;
  onSupprimer?: () => Promise<void>;
}) {
  const tz = mariage.fuseau_horaire;
  const dureeInitiale = initial?.fin ? minutesEntre(initial.debut, initial.fin) : 30;

  const [titre, setTitre] = useState(initial?.titre ?? "");
  const [heure, setHeure] = useState(initial ? heureSaisie(initial.debut, tz) : (heureProposee ?? "14:00"));
  const [modeFin, setModeFin] = useState<ModeFin>(initial && !initial.fin ? "aucune" : "duree");
  const [duree, setDuree] = useState(dureeInitiale);
  const [heureFin, setHeureFin] = useState(
    initial?.fin ? heureSaisie(initial.fin, tz) : "",
  );
  const [lieu, setLieu] = useState(initial?.lieu ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [assignes, setAssignes] = useState<string[]>(initial?.intervenants ?? []);
  const [enCours, setEnCours] = useState(false);
  const [confirmer, setConfirmer] = useState(false);
  const [erreur, setErreur] = useState("");

  const durees = DUREES.includes(duree) ? DUREES : [...DUREES, duree].sort((a, b) => a - b);

  function basculer(id: string) {
    setAssignes((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));
  }

  async function agir(action: () => Promise<void>) {
    setErreur("");
    setEnCours(true);
    try {
      await action();
    } catch (e) {
      setErreur(messageErreur(e as Error));
      setEnCours(false);
    }
  }

  function calculerFin(debut: string): string | null {
    if (modeFin === "aucune") return null;
    if (modeFin === "duree") return ajouterMinutes(debut, duree);
    if (!heureFin) return null;
    // Écart entre les deux heures (une fin « plus tôt » signifie après minuit)
    const [h1, m1] = heure.split(":").map(Number);
    const [h2, m2] = heureFin.split(":").map(Number);
    const ecart = (h2 * 60 + m2 - (h1 * 60 + m1) + 1440) % 1440;
    return ajouterMinutes(debut, ecart);
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const debut = versInstant(mariage.date_mariage, heure, tz);
        agir(() =>
          onEnregistrer({
            titre: titre.trim(),
            debut,
            fin: calculerFin(debut),
            lieu: lieu.trim() || null,
            notes: notes.trim() || null,
            intervenants: assignes,
          }),
        );
      }}
    >
      <Champ
        id="titre"
        libelle="Titre du moment"
        placeholder="Cérémonie laïque"
        list="titres-suggeres"
        value={titre}
        onChange={(e) => setTitre(e.target.value)}
        required
        autoComplete="off"
      />
      <datalist id="titres-suggeres">
        {TITRES_SUGGERES.map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>

      <Champ
        id="heure"
        libelle="Heure de début"
        type="time"
        value={heure}
        onChange={(e) => setHeure(e.target.value)}
        required
        aide="Une heure entre 0 h et 5 h 59 est placée dans la nuit qui suit le mariage."
      />

      <Choix<ModeFin>
        libelle="Fin du moment"
        valeur={modeFin}
        onChange={setModeFin}
        options={[
          { valeur: "duree", texte: "Durée" },
          { valeur: "heure", texte: "Heure de fin" },
          { valeur: "aucune", texte: "Aucune" },
        ]}
      />
      {modeFin === "duree" && (
        <Selecteur id="duree" libelle="Durée" value={duree} onChange={(e) => setDuree(Number(e.target.value))}>
          {durees.map((d) => (
            <option key={d} value={d}>
              {dureeLisible(d)}
            </option>
          ))}
        </Selecteur>
      )}
      {modeFin === "heure" && (
        <Champ
          id="heureFin"
          libelle="Heure de fin"
          type="time"
          value={heureFin}
          onChange={(e) => setHeureFin(e.target.value)}
          required
        />
      )}

      <Champ
        id="lieuMoment"
        libelle="Lieu"
        placeholder="Jardin, salle de réception, église…"
        list="lieux-connus"
        value={lieu}
        onChange={(e) => setLieu(e.target.value)}
        autoComplete="off"
      />
      <datalist id="lieux-connus">
        {lieuxConnus.map((l) => (
          <option key={l} value={l} />
        ))}
      </datalist>

      <fieldset>
        <legend className="mb-2 text-sm font-medium">Qui est concerné ?</legend>
        {intervenants.length === 0 ? (
          <p className="text-sm text-encre-doux">
            Ajoutez d&apos;abord des intervenants dans l&apos;onglet « Intervenants ».
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {intervenants.map((i) => {
              const actif = assignes.includes(i.id);
              return (
                <button
                  key={i.id}
                  type="button"
                  aria-pressed={actif}
                  onClick={() => basculer(i.id)}
                  className={`min-h-[44px] rounded-full px-4 text-sm transition-colors ${
                    actif
                      ? "bg-or text-blanc"
                      : "bg-blanc text-encre ring-1 ring-or-clair"
                  }`}
                >
                  {actif && "✓ "}
                  {i.nom}
                  {i.role && <span className={actif ? "text-blanc/80" : "text-encre-doux"}> · {i.role}</span>}
                </button>
              );
            })}
          </div>
        )}
      </fieldset>

      <ZoneTexte
        id="notes"
        libelle="Notes (facultatif)"
        placeholder="Musique d'entrée : « La Vie en rose ». Prévoir les alliances."
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

      {erreur && <p className="text-sm text-alerte">{erreur}</p>}
      <Bouton type="submit" disabled={enCours}>
        {enCours ? "Enregistrement…" : initial ? "Enregistrer" : "Ajouter le moment"}
      </Bouton>

      {onSupprimer &&
        (!confirmer ? (
          <Bouton type="button" variante="discret" onClick={() => setConfirmer(true)}>
            Supprimer ce moment
          </Bouton>
        ) : (
          <div className="flex flex-col gap-2 rounded-2xl bg-blanc p-4 text-center">
            <p className="text-sm">Supprimer définitivement ce moment ?</p>
            <Bouton type="button" variante="danger" disabled={enCours} onClick={() => agir(onSupprimer)}>
              Oui, supprimer
            </Bouton>
            <Bouton type="button" variante="discret" onClick={() => setConfirmer(false)}>
              Annuler
            </Bouton>
          </div>
        ))}
    </form>
  );
}
