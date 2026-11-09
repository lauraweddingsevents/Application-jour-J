"use client";
import { useState } from "react";
import { Bouton } from "@/components/ui/Bouton";
import { Champ } from "@/components/ui/Champ";
import { Choix } from "@/components/ui/Choix";
import { Selecteur } from "@/components/ui/Selecteur";
import { ZoneTexte } from "@/components/ui/ZoneTexte";
import { messageErreur } from "@/lib/erreurs";
import type { ElementFicheSaisi } from "@/lib/donnees";
import type { CategorieFiche, Intervenant, Visibilite } from "@/lib/types";

const TEXTES: Record<CategorieFiche, { titre: string; contenu: string }> = {
  contact: { titre: "Laura – Wedding planner", contenu: "Joignable toute la journée." },
  adresse: { titre: "Lieu de réception", contenu: "Parking derrière le château." },
  meteo: { titre: "En cas de pluie", contenu: "La cérémonie a lieu sous l'orangerie. Décision prise à 12 h." },
  note: { titre: "Code du portail", contenu: "2580" },
};

export function FormulaireFiche({
  initial,
  intervenants,
  onEnregistrer,
  onSupprimer,
}: {
  initial?: ElementFicheSaisi;
  intervenants: Intervenant[];
  onEnregistrer: (e: ElementFicheSaisi) => Promise<void>;
  onSupprimer?: () => Promise<void>;
}) {
  const [e, setE] = useState<ElementFicheSaisi>(
    initial ?? { categorie: "contact", titre: "", contenu: "", telephone: "", adresse: "", visibilite: "tous" },
  );
  const [enCours, setEnCours] = useState(false);
  const [confirmer, setConfirmer] = useState(false);
  const [erreur, setErreur] = useState("");
  const maj = <K extends keyof ElementFicheSaisi>(k: K, v: ElementFicheSaisi[K]) =>
    setE((a) => ({ ...a, [k]: v }));

  const avecTel = intervenants.filter((i) => i.telephone);

  async function agir(action: () => Promise<void>) {
    setErreur("");
    setEnCours(true);
    try {
      await action();
    } catch (err) {
      setErreur(messageErreur(err as Error));
      setEnCours(false);
    }
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(ev) => {
        ev.preventDefault();
        agir(() =>
          onEnregistrer({
            ...e,
            titre: e.titre.trim(),
            contenu: e.contenu?.trim() || null,
            telephone: e.categorie === "contact" ? e.telephone?.trim() || null : null,
            adresse: e.categorie === "adresse" ? e.adresse?.trim() || null : null,
          }),
        );
      }}
    >
      <Choix<CategorieFiche>
        libelle="Type d'information"
        valeur={e.categorie}
        onChange={(c) => maj("categorie", c)}
        options={[
          { valeur: "contact", texte: "Contact" },
          { valeur: "adresse", texte: "Adresse" },
          { valeur: "meteo", texte: "Météo" },
          { valeur: "note", texte: "Note" },
        ]}
      />

      {e.categorie === "contact" && !initial && avecTel.length > 0 && (
        <Selecteur
          id="depuis"
          libelle="Reprendre un intervenant (facultatif)"
          defaultValue=""
          onChange={(ev) => {
            const i = avecTel.find((x) => x.id === ev.target.value);
            if (i) {
              maj("titre", i.role ? `${i.nom} – ${i.role}` : i.nom);
              maj("telephone", i.telephone);
            }
          }}
        >
          <option value="">— Choisir —</option>
          {avecTel.map((i) => (
            <option key={i.id} value={i.id}>
              {i.nom}
              {i.role ? ` (${i.role})` : ""}
            </option>
          ))}
        </Selecteur>
      )}

      <Champ
        id="titreFiche"
        libelle={e.categorie === "contact" ? "Nom et rôle" : "Titre"}
        placeholder={TEXTES[e.categorie].titre}
        value={e.titre}
        onChange={(ev) => maj("titre", ev.target.value)}
        required
        autoComplete="off"
      />
      {e.categorie === "contact" && (
        <Champ
          id="telFiche"
          libelle="Téléphone"
          type="tel"
          inputMode="tel"
          placeholder="06 12 34 56 78"
          value={e.telephone ?? ""}
          onChange={(ev) => maj("telephone", ev.target.value)}
          autoComplete="off"
        />
      )}
      {e.categorie === "adresse" && (
        <Champ
          id="adresseFiche"
          libelle="Adresse"
          placeholder="12 route des Vignes, 33330 Saint-Émilion"
          value={e.adresse ?? ""}
          onChange={(ev) => maj("adresse", ev.target.value)}
          aide="Un bouton « Itinéraire Google Maps » sera affiché."
          autoComplete="off"
        />
      )}
      <ZoneTexte
        id="contenuFiche"
        libelle="Détails (facultatif)"
        placeholder={TEXTES[e.categorie].contenu}
        value={e.contenu ?? ""}
        onChange={(ev) => maj("contenu", ev.target.value)}
      />
      <Choix<Visibilite>
        libelle="Qui peut voir cette information ?"
        valeur={e.visibilite}
        onChange={(v) => maj("visibilite", v)}
        options={[
          { valeur: "tous", texte: "Tout le monde" },
          { valeur: "prestataires", texte: "Prestataires" },
        ]}
      />
      <p className="-mt-2 text-xs text-encre-doux">
        « Prestataires » : cachée aux proches, sauf à ceux qui ont l&apos;accès coordination.
      </p>

      {erreur && <p className="text-sm text-alerte">{erreur}</p>}
      <Bouton type="submit" disabled={enCours}>
        {enCours ? "Enregistrement…" : initial ? "Enregistrer" : "Ajouter à la fiche"}
      </Bouton>
      {onSupprimer &&
        (!confirmer ? (
          <Bouton type="button" variante="discret" onClick={() => setConfirmer(true)}>
            Supprimer cette information
          </Bouton>
        ) : (
          <div className="flex flex-col gap-2 rounded-2xl bg-blanc p-4 text-center">
            <p className="text-sm">Supprimer définitivement ?</p>
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
