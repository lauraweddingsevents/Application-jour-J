"use client";
import { useEffect, useMemo, useState } from "react";
import { BoutonLien } from "@/components/ui/Bouton";
import { Carte } from "@/components/ui/Carte";
import { Choix } from "@/components/ui/Choix";
import { Liste } from "@/components/ui/Liste";
import { GuideInstallation } from "@/components/GuideInstallation";
import { CarteDemande } from "@/components/demandes/CarteDemande";
import { useMembre, nomMetier } from "@/lib/membre";
import { supabaseNavigateur } from "@/lib/supabase/navigateur";
import { messageErreur } from "@/lib/erreurs";
import { DEPARTEMENTS, ZONES } from "@/lib/zones";
import type { LigneDemande } from "@/lib/demandes";

type Filtres = { pourMoi: boolean; zone: string; departement: string; metier: string; du: string; au: string };
const CLE = "relais-filtres";

function filtresInitiaux(zones: string[]): Filtres {
  const defaut = { pourMoi: false, zone: zones.length === 1 ? zones[0] : "toutes", departement: "", metier: "", du: "", au: "" };
  try {
    const memo = localStorage.getItem(CLE);
    if (memo) return { ...defaut, ...JSON.parse(memo) };
  } catch {}
  return defaut;
}

// Liste des demandes ouvertes, avec filtres
export function ListeDemandes() {
  const { membre, metiers } = useMembre();
  const [demandes, setDemandes] = useState<LigneDemande[] | null>(null);
  const [erreur, setErreur] = useState("");
  const [f, setF] = useState<Filtres>(() => filtresInitiaux(membre?.zones ?? []));
  const [plus, setPlus] = useState(Boolean(f.du || f.au));

  useEffect(() => {
    supabaseNavigateur()
      .rpc("liste_demandes")
      .then(({ data, error }) => {
        if (error) setErreur(messageErreur(error));
        setDemandes((data as LigneDemande[]) ?? []);
      });
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(CLE, JSON.stringify(f));
    } catch {}
  }, [f]);

  const maj = (x: Partial<Filtres>) => setF((ancien) => ({ ...ancien, ...x }));

  const affichees = useMemo(() => {
    if (!demandes || !membre) return [];
    return demandes.filter((d) => {
      if (f.pourMoi && (d.metier_id !== membre.metier_id || !membre.departements.includes(d.departement))) return false;
      if (f.zone !== "toutes" && d.zone !== f.zone) return false;
      if (f.departement && d.departement !== f.departement) return false;
      if (f.metier && String(d.metier_id) !== f.metier) return false;
      if (f.du && d.date_mariage < f.du) return false;
      if (f.au && d.date_mariage > f.au) return false;
      return true;
    });
  }, [demandes, membre, f]);

  const departements = DEPARTEMENTS.filter((d) => f.zone === "toutes" || d.zone === f.zone);
  const nbFiltres = [f.departement, f.metier, f.du, f.au].filter(Boolean).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-3">
        <h1 className="text-2xl font-light">Demandes ouvertes</h1>
        {demandes && <span className="text-sm text-encre-doux">{affichees.length} sur {demandes.length}</span>}
      </div>

      <div className="flex flex-col gap-3">
        <Choix<string>
          libelle="Zone"
          valeur={f.zone}
          onChange={(zone) => maj({ zone, departement: "" })}
          options={[{ valeur: "toutes", texte: "Toutes" }, ...ZONES.map((z) => ({ valeur: z.code, texte: z.nom }))]}
        />
        <button
          type="button"
          aria-pressed={f.pourMoi}
          onClick={() => maj({ pourMoi: !f.pourMoi })}
          className={`min-h-[48px] rounded-full border px-4 text-sm font-medium ${
            f.pourMoi ? "border-or bg-or text-blanc" : "border-or-clair bg-blanc text-encre"
          }`}
        >
          {f.pourMoi ? "✓ " : ""}Pour moi : {nomMetier(metiers, membre?.metier_id) || "mon métier"} dans mes départements
        </button>
        <button type="button" onClick={() => setPlus(!plus)} className="min-h-[40px] self-start text-sm text-or-fonce underline underline-offset-4">
          {plus ? "Masquer les filtres" : `Plus de filtres${nbFiltres ? ` (${nbFiltres})` : ""}`}
        </button>
        {plus && (
          <Carte className="flex flex-col gap-4">
            <Liste id="f-dep" libelle="Département" value={f.departement} onChange={(e) => maj({ departement: e.target.value })}>
              <option value="">Tous</option>
              {departements.map((d) => <option key={d.code} value={d.code}>{d.code} · {d.nom}</option>)}
            </Liste>
            <Liste id="f-metier" libelle="Métier recherché" value={f.metier} onChange={(e) => maj({ metier: e.target.value })}>
              <option value="">Tous</option>
              {metiers.map((m) => <option key={m.id} value={m.id}>{m.nom}</option>)}
            </Liste>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Mariage à partir du
                <input type="date" value={f.du} onChange={(e) => maj({ du: e.target.value })}
                  className="min-h-[52px] rounded-2xl border border-or-clair bg-blanc px-3 text-base font-normal" />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Jusqu&apos;au
                <input type="date" value={f.au} onChange={(e) => maj({ au: e.target.value })}
                  className="min-h-[52px] rounded-2xl border border-or-clair bg-blanc px-3 text-base font-normal" />
              </label>
            </div>
            {nbFiltres > 0 && (
              <button type="button" className="min-h-[40px] text-sm text-or-fonce underline underline-offset-4"
                onClick={() => maj({ departement: "", metier: "", du: "", au: "" })}>
                Effacer ces filtres
              </button>
            )}
          </Carte>
        )}
      </div>

      <GuideInstallation />
      {erreur && <p className="text-sm text-alerte">{erreur}</p>}
      {!demandes && <p className="text-encre-doux">Chargement des demandes…</p>}
      {demandes && affichees.length === 0 && (
        <Carte className="flex flex-col gap-4 text-center">
          <p className="text-encre-doux">
            {demandes.length === 0 ? "Aucune demande ouverte pour le moment." : "Aucune demande ne correspond à ces filtres."}
          </p>
          <BoutonLien href="/deposer" variante="secondaire">Déposer une demande</BoutonLien>
        </Carte>
      )}
      <div className="flex flex-col gap-3">
        {affichees.map((d) => (
          <CarteDemande key={d.id} d={d} metier={nomMetier(metiers, d.metier_id)} moi={membre?.id} />
        ))}
      </div>
    </div>
  );
}
