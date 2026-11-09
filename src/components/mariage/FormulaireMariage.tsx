"use client";
import { useState } from "react";
import { Bouton } from "@/components/ui/Bouton";
import { Champ } from "@/components/ui/Champ";
import { Selecteur } from "@/components/ui/Selecteur";
import { messageErreur } from "@/lib/erreurs";
import type { MariageSaisi } from "@/lib/donnees";

export const DELAIS_ALERTE = [5, 10, 15, 20, 30, 45, 60];

export function FormulaireMariage({
  initial,
  texteBouton,
  onEnregistrer,
}: {
  initial?: MariageSaisi;
  texteBouton: string;
  onEnregistrer: (m: MariageSaisi) => Promise<void>;
}) {
  const [m, setM] = useState<MariageSaisi>(
    initial ?? {
      nom_marie_1: "",
      nom_marie_2: "",
      date_mariage: "",
      lieu_principal: "",
      delai_alerte_defaut: 15,
    },
  );
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState("");

  const maj = <K extends keyof MariageSaisi>(cle: K, valeur: MariageSaisi[K]) =>
    setM((avant) => ({ ...avant, [cle]: valeur }));

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    setErreur("");
    setEnCours(true);
    try {
      await onEnregistrer({
        ...m,
        nom_marie_1: m.nom_marie_1.trim(),
        nom_marie_2: m.nom_marie_2.trim(),
        lieu_principal: m.lieu_principal?.trim() || null,
      });
    } catch (err) {
      setErreur(messageErreur(err as Error));
    } finally {
      setEnCours(false);
    }
  }

  return (
    <form onSubmit={envoyer} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <Champ
          id="marie1"
          libelle="Prénom"
          placeholder="Camille"
          value={m.nom_marie_1}
          onChange={(e) => maj("nom_marie_1", e.target.value)}
          required
          autoComplete="off"
        />
        <Champ
          id="marie2"
          libelle="Prénom"
          placeholder="Julien"
          value={m.nom_marie_2}
          onChange={(e) => maj("nom_marie_2", e.target.value)}
          required
          autoComplete="off"
        />
      </div>
      <Champ
        id="date"
        libelle="Date du mariage"
        type="date"
        value={m.date_mariage}
        onChange={(e) => maj("date_mariage", e.target.value)}
        required
      />
      <Champ
        id="lieu"
        libelle="Lieu principal"
        placeholder="Château de la Roseraie, Saint-Émilion"
        value={m.lieu_principal ?? ""}
        onChange={(e) => maj("lieu_principal", e.target.value)}
        autoComplete="off"
      />
      <Selecteur
        id="delai"
        libelle="Alerte avant chaque moment (par défaut)"
        aide="Chaque intervenant pourra choisir son propre délai."
        value={m.delai_alerte_defaut}
        onChange={(e) => maj("delai_alerte_defaut", Number(e.target.value))}
      >
        {DELAIS_ALERTE.map((d) => (
          <option key={d} value={d}>
            {d} minutes avant
          </option>
        ))}
      </Selecteur>
      {erreur && <p className="text-sm text-alerte">{erreur}</p>}
      <Bouton type="submit" disabled={enCours}>
        {enCours ? "Enregistrement…" : texteBouton}
      </Bouton>
    </form>
  );
}
