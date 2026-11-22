"use client";
import { useEffect, useState } from "react";
import { BoutonLien } from "@/components/ui/Bouton";
import { Carte } from "@/components/ui/Carte";
import { Signaler } from "@/components/Signaler";
import { useMembre, nomMetier } from "@/lib/membre";
import { supabaseNavigateur } from "@/lib/supabase/navigateur";
import { libelleDepartement, ZONES } from "@/lib/zones";

type Fiche = {
  id: string;
  nom: string;
  entreprise: string;
  metier_id: number | null;
  zones: string[];
  departements: string[];
  lien: string;
  role: string;
  statut: string;
  cree_le: string;
  donnees: number;
  recues: number;
  signees: number;
};

// Instagram (« @compte ») ou site : on fabrique un lien cliquable
function adresseLien(lien: string) {
  const l = lien.trim();
  if (/^https?:\/\//i.test(l)) return l;
  if (l.startsWith("@")) return `https://instagram.com/${l.slice(1)}`;
  if (/instagram\.com/i.test(l)) return `https://${l.replace(/^\/+/, "")}`;
  return `https://${l}`;
}

export function FicheMembre({ id }: { id: string }) {
  const { metiers, membre: moi } = useMembre();
  const [f, setF] = useState<Fiche | null | undefined>(undefined);

  useEffect(() => {
    supabaseNavigateur()
      .rpc("fiche_membre", { p_id: id })
      .then(({ data }) => setF((data as Fiche | null) ?? null));
  }, [id]);

  if (f === undefined) return <p className="text-encre-doux">Chargement…</p>;
  if (f === null) return <Carte className="text-center">Ce membre n&apos;est pas (ou plus) visible.</Carte>;
  const estMoi = moi?.id === f.id;

  return (
    <div className="flex flex-col gap-4">
      <Carte className="flex flex-col items-center gap-2 text-center">
        <span aria-hidden className="flex size-16 items-center justify-center rounded-full bg-or-clair/60 text-2xl font-light text-or-fonce">
          {f.nom.split(/\s+/).map((m) => m[0]).slice(0, 2).join("").toUpperCase()}
        </span>
        <h1 className="text-2xl font-light">{f.nom}</h1>
        {f.entreprise && <p className="text-encre-doux">{f.entreprise}</p>}
        <p className="font-medium text-or-fonce">{nomMetier(metiers, f.metier_id)}</p>
        {f.lien && (
          <a href={adresseLien(f.lien)} target="_blank" rel="noopener noreferrer" className="break-all text-or-fonce underline underline-offset-4">
            {f.lien}
          </a>
        )}
        {f.statut === "suspendu" && <p className="rounded-full bg-alerte/10 px-3 py-1 text-sm text-alerte">Compte suspendu</p>}
      </Carte>

      {/* Compteur de réciprocité */}
      <div className="grid grid-cols-2 gap-3">
        <Carte className="text-center">
          <p className="text-3xl font-light text-or-fonce">{f.donnees}</p>
          <p className="text-sm text-encre-doux">demande{f.donnees > 1 ? "s" : ""} donnée{f.donnees > 1 ? "s" : ""}</p>
        </Carte>
        <Carte className="text-center">
          <p className="text-3xl font-light text-or-fonce">{f.recues}</p>
          <p className="text-sm text-encre-doux">demande{f.recues > 1 ? "s" : ""} reçue{f.recues > 1 ? "s" : ""}</p>
        </Carte>
      </div>
      {f.signees > 0 && (
        <p className="text-center text-sm text-encre-doux">
          {f.signees} mariage{f.signees > 1 ? "s" : ""} signé{f.signees > 1 ? "s" : ""} grâce à la communauté
        </p>
      )}

      <Carte className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">Communauté</h2>
        <p>{ZONES.filter((z) => f.zones.includes(z.code)).map((z) => `${z.communaute} (${z.nom})`).join(" · ")}</p>
        <h2 className="mt-2 text-sm font-medium">Départements couverts</h2>
        <div className="flex flex-wrap gap-1.5">
          {f.departements.map((d) => (
            <span key={d} className="rounded-full bg-creme-fonce px-3 py-1 text-sm">{libelleDepartement(d)}</span>
          ))}
        </div>
        <p className="mt-2 text-xs text-encre-doux">Membre depuis le {new Date(f.cree_le).toLocaleDateString("fr-FR")}</p>
      </Carte>

      {estMoi ? <BoutonLien href="/profil" variante="secondaire">Modifier ma fiche</BoutonLien> : <Signaler cible="membre" id={f.id} />}
    </div>
  );
}
