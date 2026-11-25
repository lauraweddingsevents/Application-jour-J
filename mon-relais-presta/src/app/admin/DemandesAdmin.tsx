"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Carte } from "@/components/ui/Carte";
import { Champ } from "@/components/ui/Champ";
import { Pastille } from "@/components/demandes/Pastille";
import { useMembre, nomMetier } from "@/lib/membre";
import { supabaseNavigateur } from "@/lib/supabase/navigateur";
import { messageErreur } from "@/lib/erreurs";
import { dateCourte, PLACES_MAX, type StatutDemande } from "@/lib/demandes";

type Repondant = {
  membre_id: string;
  nom: string;
  entreprise: string;
  message: string;
  cree_le: string;
  retire_le: string | null;
  coordonnees_recues_le: string | null;
};
type DemandeAdmin = {
  id: string;
  date_mariage: string;
  departement: string;
  lieu: string;
  metier_id: number;
  mode_coordonnees: string;
  statut: StatutDemande;
  cree_le: string;
  signee_par: string | null;
  auteur: { id: string; nom: string; entreprise: string };
  positionnes: Repondant[];
};
type Filtre = "toutes" | "sans_reponse" | "en_cours" | "signees";

const FILTRES: [Filtre, string][] = [
  ["toutes", "Toutes"],
  ["sans_reponse", "Sans réponse"],
  ["en_cours", "En cours"],
  ["signees", "Signées"],
];

// Toutes les demandes, avec les prestataires qui y ont répondu (« Je suis dispo »)
export function DemandesAdmin() {
  const { metiers } = useMembre();
  const [liste, setListe] = useState<DemandeAdmin[] | null>(null);
  const [filtre, setFiltre] = useState<Filtre>("toutes");
  const [recherche, setRecherche] = useState("");
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    supabaseNavigateur()
      .rpc("admin_demandes")
      .then(({ data, error }) => {
        if (error) setErreur(messageErreur(error));
        setListe((data as DemandeAdmin[]) ?? []);
      });
  }, []);

  if (!liste) return <p className="text-encre-doux">{erreur || "Chargement…"}</p>;

  const actifs = (d: DemandeAdmin) => d.positionnes.filter((p) => !p.retire_le);
  const q = recherche.trim().toLowerCase();
  const affichees = liste
    .filter((d) => {
      if (filtre === "sans_reponse") return d.statut === "ouverte" && actifs(d).length === 0;
      if (filtre === "en_cours") return d.statut === "ouverte" || d.statut === "transmise";
      if (filtre === "signees") return d.statut === "signee";
      return true;
    })
    .filter(
      (d) =>
        !q ||
        [d.lieu, d.departement, d.auteur.nom, nomMetier(metiers, d.metier_id), ...d.positionnes.map((p) => p.nom)]
          .join(" ")
          .toLowerCase()
          .includes(q),
    );

  return (
    <div className="flex flex-col gap-3">
      {erreur && <p className="text-sm text-alerte">{erreur}</p>}
      <div className="flex flex-wrap gap-2">
        {FILTRES.map(([v, t]) => (
          <button key={v} type="button" aria-pressed={filtre === v} onClick={() => setFiltre(v)}
            className={`min-h-[40px] rounded-full border px-3 text-sm font-medium ${filtre === v ? "border-or bg-or text-blanc" : "border-or-clair bg-blanc"}`}>
            {t}
          </button>
        ))}
      </div>
      <Champ id="recherche-demandes" libelle="Rechercher" placeholder="Lieu, métier, membre…" value={recherche}
        onChange={(e) => setRecherche(e.target.value)} />
      <p className="text-sm text-encre-doux">{affichees.length} demande{affichees.length > 1 ? "s" : ""}</p>

      {affichees.length === 0 && <Carte className="text-encre-doux">Aucune demande.</Carte>}
      {affichees.map((d) => {
        const enCours = d.statut === "ouverte" || d.statut === "transmise";
        const nb = actifs(d).length;
        return (
          <Carte key={d.id} className="flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <Link href={`/demande/${d.id}`} className="font-medium text-or-fonce underline underline-offset-4">
                  {nomMetier(metiers, d.metier_id)}
                </Link>
                <p className="text-sm">{dateCourte(d.date_mariage)} · {d.lieu} ({d.departement})</p>
              </div>
              <Pastille statut={d.statut} complete={enCours && nb >= PLACES_MAX} />
            </div>
            <p className="text-sm text-encre-doux">
              Déposée le {new Date(d.cree_le).toLocaleDateString("fr-FR")} par{" "}
              <Link href={`/membre/${d.auteur.id}`} className="underline underline-offset-4">{d.auteur.nom}</Link>
            </p>

            <div className="rounded-2xl bg-creme-fonce/50 p-3">
              <p className="text-sm font-medium">
                {d.positionnes.length === 0 ? "Personne n'a encore répondu" : `Ont répondu (${nb}/${PLACES_MAX})`}
              </p>
              {d.positionnes.length > 0 && (
                <ul className="mt-1 flex flex-col gap-1.5">
                  {d.positionnes.map((p) => (
                    <li key={p.membre_id + p.cree_le} className={`text-sm ${p.retire_le ? "text-encre-doux line-through" : ""}`}>
                      <Link href={`/membre/${p.membre_id}`} className="font-medium underline underline-offset-4">{p.nom}</Link>
                      {p.entreprise && <span className="text-encre-doux"> · {p.entreprise}</span>}
                      <span className="text-encre-doux"> · le {new Date(p.cree_le).toLocaleDateString("fr-FR")}</span>
                      {p.retire_le && <span className="no-underline"> (s&apos;est retiré)</span>}
                      {!p.retire_le && d.signee_par === p.membre_id && <span className="font-medium text-succes"> · ✓ signé</span>}
                      {!p.retire_le && d.mode_coordonnees === "par_auteur" && (
                        <span className={p.coordonnees_recues_le ? "text-succes" : "text-or-fonce"}>
                          {p.coordonnees_recues_le ? " · coordonnées reçues" : " · coordonnées pas encore reçues"}
                        </span>
                      )}
                      {p.message && <span className="block italic text-encre-doux">« {p.message} »</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Carte>
        );
      })}
    </div>
  );
}
