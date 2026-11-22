"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { BoutonLien } from "@/components/ui/Bouton";
import { Carte } from "@/components/ui/Carte";
import { Choix } from "@/components/ui/Choix";
import { Pastille } from "@/components/demandes/Pastille";
import { useMembre, nomMetier } from "@/lib/membre";
import { supabaseNavigateur } from "@/lib/supabase/navigateur";
import { messageErreur } from "@/lib/erreurs";
import { dateCourte, PLACES_MAX, type Suivi } from "@/lib/demandes";

type Onglet = "donnees" | "positionne";

// Mes demandes données, et celles sur lesquelles je me suis positionné(e)
export function MesSuivis() {
  const { metiers } = useMembre();
  const [suivis, setSuivis] = useState<Suivi[] | null>(null);
  const [onglet, setOnglet] = useState<Onglet>("donnees");
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    supabaseNavigateur()
      .rpc("mes_suivis")
      .then(({ data, error }) => {
        if (error) setErreur(messageErreur(error));
        setSuivis((data as Suivi[]) ?? []);
      });
  }, []);

  const donnees = (suivis ?? []).filter((s) => s.role === "auteur");
  const positionne = (suivis ?? []).filter((s) => s.role === "positionne");
  const liste = onglet === "donnees" ? donnees : positionne;
  // À faire d'abord : les demandes à mettre à jour, puis les actives, puis le reste
  const rang = (s: Suivi) => (s.statut === "transmise" ? 0 : s.statut === "ouverte" ? 1 : 2);
  const triee = [...liste].sort((a, b) => rang(a) - rang(b) || a.date_mariage.localeCompare(b.date_mariage));

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-light">Mes suivis</h1>
      <Choix<Onglet>
        libelle="Afficher"
        valeur={onglet}
        onChange={setOnglet}
        options={[
          { valeur: "donnees", texte: `Données (${donnees.length})` },
          { valeur: "positionne", texte: `Positionné (${positionne.length})` },
        ]}
      />
      {erreur && <p className="text-sm text-alerte">{erreur}</p>}
      {!suivis && <p className="text-encre-doux">Chargement…</p>}
      {suivis && triee.length === 0 && (
        <Carte className="flex flex-col gap-4 text-center text-encre-doux">
          {onglet === "donnees" ? (
            <>
              <p>Vous n&apos;avez pas encore transmis de demande.</p>
              <BoutonLien href="/deposer" variante="secondaire">Déposer une demande</BoutonLien>
            </>
          ) : (
            <>
              <p>Vous ne vous êtes encore positionné(e) sur aucune demande.</p>
              <BoutonLien href="/demandes" variante="secondaire">Voir les demandes ouvertes</BoutonLien>
            </>
          )}
        </Carte>
      )}
      <div className="flex flex-col gap-3">
        {triee.map((s) => (
          <Link key={s.id} href={`/demande/${s.id}`}
            className={`block rounded-carte bg-blanc p-4 ring-1 ring-or-clair/40 ${s.retire_le ? "opacity-60" : ""}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium">{nomMetier(metiers, s.metier_id)}</p>
                <p className="text-sm text-or-fonce">{dateCourte(s.date_mariage)}</p>
              </div>
              <Pastille statut={s.statut} complete={s.complete} />
            </div>
            <p className="mt-1 text-sm text-encre-doux">
              📍 {s.lieu} ({s.departement})
              {s.role === "auteur" ? ` · ${s.nb_positionnes}/${PLACES_MAX} positionné${s.nb_positionnes > 1 ? "s" : ""}` : ` · de ${s.auteur_nom}`}
            </p>
            {s.role === "auteur" && s.statut === "transmise" && (
              <p className="mt-2 text-sm font-medium text-or-fonce">→ Signée ou non ? Pensez à mettre à jour le statut.</p>
            )}
            {s.role === "positionne" && s.retire_le && <p className="mt-2 text-sm">Vous vous êtes retiré(e).</p>}
            {s.role === "positionne" && !s.retire_le && s.mode_coordonnees === "par_auteur" && !s.coordonnees_recues_le && (
              <p className="mt-2 text-sm font-medium text-or-fonce">→ Coordonnées reçues ? Confirmez-le.</p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
