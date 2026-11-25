"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Carte } from "@/components/ui/Carte";
import { Choix } from "@/components/ui/Choix";
import { useMembre, nomMetier } from "@/lib/membre";
import { supabaseNavigateur } from "@/lib/supabase/navigateur";
import { messageErreur } from "@/lib/erreurs";
import { libelleDepartement, nomZone } from "@/lib/zones";

type Ligne = { cle: string | number; deposees: number; transmises: number; signees: number };
type Stats = {
  total: { deposees: number; transmises: number; signees: number; non_signees: number; expirees: number; ouvertes: number };
  par_zone: Ligne[];
  par_departement: Ligne[];
  par_metier: Ligne[];
  positionnements: { total: number; retires: number; a_confirmer: number; coordonnees_recues: number; recues_sous_24h: number };
  membres: { valides: number; en_attente: number; suspendus: number; paca: number; rhone_alpes: number };
  meilleurs_donneurs: { id: string; nom: string; donnees: number }[];
  meilleurs_repondants?: { id: string; nom: string; reponses: number; signees: number }[];
};
type Periode = "tout" | "annee" | "90j";

function depuis(p: Periode) {
  if (p === "tout") return null;
  const d = new Date();
  if (p === "annee") return `${d.getFullYear()}-01-01`;
  d.setDate(d.getDate() - 90);
  return d.toISOString().slice(0, 10);
}

const pourcent = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)} %` : "–");

// Tableau de bord : chiffres clés, puis détail par zone, département et métier
export function Statistiques() {
  const { metiers } = useMembre();
  const [periode, setPeriode] = useState<Periode>("tout");
  const [s, setS] = useState<Stats | null>(null);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    supabaseNavigateur()
      .rpc("admin_statistiques", { p_depuis: depuis(periode) })
      .then(({ data, error }) => {
        if (error) setErreur(messageErreur(error));
        setS(data as Stats | null);
      });
  }, [periode]);

  return (
    <div className="flex flex-col gap-4">
      <Choix<Periode>
        libelle="Période (date de dépôt)"
        valeur={periode}
        onChange={setPeriode}
        options={[
          { valeur: "tout", texte: "Tout" },
          { valeur: "annee", texte: "Cette année" },
          { valeur: "90j", texte: "90 jours" },
        ]}
      />
      {erreur && <p className="text-sm text-alerte">{erreur}</p>}
      {!s ? (
        <p className="text-encre-doux">Chargement…</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            <Tuile valeur={s.total.deposees} libelle="déposées" />
            <Tuile valeur={s.total.transmises} libelle="transmises" detail={pourcent(s.total.transmises, s.total.deposees)} />
            <Tuile valeur={s.total.signees} libelle="signées" detail={pourcent(s.total.signees, s.total.transmises)} />
          </div>
          <p className="text-sm text-encre-doux">
            {s.total.ouvertes} ouverte{s.total.ouvertes > 1 ? "s" : ""} en ce moment · {s.total.non_signees} non signée
            {s.total.non_signees > 1 ? "s" : ""} · {s.total.expirees} expirée{s.total.expirees > 1 ? "s" : ""} sans
            prestataire. Le taux de signature est calculé sur les demandes transmises.
          </p>

          <Tableau titre="Par zone" lignes={s.par_zone} nom={(c) => nomZone(String(c))} />
          <Tableau titre="Par département" lignes={s.par_departement} nom={(c) => libelleDepartement(String(c))} />
          <Tableau titre="Par métier" lignes={s.par_metier} nom={(c) => nomMetier(metiers, Number(c))} />

          <Carte className="flex flex-col gap-2">
            <h2 className="font-medium">Coordonnées transmises par l&apos;auteur</h2>
            <p className="text-sm text-encre-doux">Demandes où l&apos;auteur transmet lui-même les coordonnées sous 24 h.</p>
            <p>
              <strong className="text-xl font-medium">{s.positionnements.coordonnees_recues}</strong> / {s.positionnements.a_confirmer} positionnés
              ont confirmé « coordonnées reçues » ({pourcent(s.positionnements.coordonnees_recues, s.positionnements.a_confirmer)}),
              dont {s.positionnements.recues_sous_24h} dans les 24 h.
            </p>
            <p className="text-sm text-encre-doux">
              {s.positionnements.total} positionnement{s.positionnements.total > 1 ? "s" : ""} au total, {s.positionnements.retires} désistement
              {s.positionnements.retires > 1 ? "s" : ""}.
            </p>
          </Carte>

          <Classement
            titre="Ceux qui répondent le plus"
            aide="Nombre de demandes sur lesquelles le membre a cliqué « Je suis dispo » (sans s'être retiré), et combien ont été signées avec lui."
            lignes={(s.meilleurs_repondants ?? []).map((m) => ({
              id: m.id,
              nom: m.nom,
              valeur: m.reponses,
              detail: m.signees ? `${m.signees} signée${m.signees > 1 ? "s" : ""}` : "",
            }))}
            unite="réponse"
          />
          <Classement
            titre="Ceux qui transmettent le plus"
            aide="Nombre de demandes déposées pour la communauté (hors annulées)."
            lignes={s.meilleurs_donneurs.map((m) => ({ id: m.id, nom: m.nom, valeur: m.donnees, detail: "" }))}
            unite="demande"
          />

          <Carte className="flex flex-col gap-2">
            <h2 className="font-medium">Membres</h2>
            <p>
              <strong className="text-xl font-medium">{s.membres.valides}</strong> validés · {s.membres.paca} en PACA ·{" "}
              {s.membres.rhone_alpes} en Rhône-Alpes
            </p>
            <p className="text-sm text-encre-doux">
              {s.membres.en_attente} en attente de validation · {s.membres.suspendus} suspendu{s.membres.suspendus > 1 ? "s" : ""}
            </p>

          </Carte>
        </>
      )}
    </div>
  );
}

// Classement des membres (lien vers leur fiche)
function Classement({ titre, aide, lignes, unite }: {
  titre: string;
  aide: string;
  lignes: { id: string; nom: string; valeur: number; detail: string }[];
  unite: string;
}) {
  return (
    <Carte className="flex flex-col gap-2">
      <h2 className="font-medium">{titre}</h2>
      <p className="text-sm text-encre-doux">{aide}</p>
      {lignes.length === 0 ? (
        <p className="text-sm text-encre-doux">Personne sur la période.</p>
      ) : (
        <ol className="flex flex-col">
          {lignes.map((l, i) => (
            <li key={l.id} className="flex min-h-[44px] items-center justify-between gap-2 border-t border-or-clair/40 text-sm">
              <Link href={`/membre/${l.id}`} className="underline-offset-4 hover:underline">
                {i + 1}. {l.nom}
              </Link>
              <span className="shrink-0 text-right tabular-nums">
                {l.valeur} {unite}{l.valeur > 1 ? "s" : ""}
                {l.detail && <span className="block text-xs text-succes">{l.detail}</span>}
              </span>
            </li>
          ))}
        </ol>
      )}
    </Carte>
  );
}

function Tuile({ valeur, libelle, detail }: { valeur: number; libelle: string; detail?: string }) {
  return (
    <Carte className="flex flex-col items-center gap-0.5 p-3 text-center">
      <span className="text-3xl font-light tabular-nums">{valeur}</span>
      <span className="text-xs text-encre-doux">{libelle}</span>
      {detail && <span className="text-xs font-medium text-or-fonce">{detail}</span>}
    </Carte>
  );
}

// Tableau lisible sur téléphone, avec une barre fine proportionnelle aux demandes déposées
function Tableau({ titre, lignes, nom }: { titre: string; lignes: Ligne[]; nom: (c: string | number) => string }) {
  const max = Math.max(1, ...lignes.map((l) => l.deposees));
  return (
    <Carte className="flex flex-col gap-3">
      <h2 className="font-medium">{titre}</h2>
      {lignes.length === 0 ? (
        <p className="text-sm text-encre-doux">Aucune demande sur la période.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-encre-doux">
              <th className="pb-2 font-normal" scope="col"></th>
              <th className="pb-2 text-right font-normal" scope="col">Déposées</th>
              <th className="pb-2 pl-2 text-right font-normal" scope="col">Transm.</th>
              <th className="pb-2 pl-2 text-right font-normal" scope="col">Signées</th>
            </tr>
          </thead>
          <tbody>
            {lignes.map((l) => (
              <tr key={String(l.cle)} className="border-t border-or-clair/40" title={`${nom(l.cle)} : ${l.deposees} déposées, ${l.transmises} transmises, ${l.signees} signées`}>
                <th scope="row" className="py-2 pr-2 text-left font-normal">
                  {nom(l.cle)}
                  <span className="mt-1 block h-1 rounded-r bg-or" style={{ width: `${(l.deposees / max) * 100}%` }} aria-hidden />
                </th>
                <td className="py-2 text-right tabular-nums">{l.deposees}</td>
                <td className="py-2 text-right tabular-nums">{l.transmises}</td>
                <td className="py-2 text-right tabular-nums">{l.signees}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Carte>
  );
}
