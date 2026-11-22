import Link from "next/link";
import { Pastille } from "@/components/demandes/Pastille";
import { dateCourte, depart, euros, PLACES_MAX, type LigneDemande } from "@/lib/demandes";

// Une demande dans la liste : l'essentiel en un coup d'œil
export function CarteDemande({ d, metier, moi }: { d: LigneDemande; metier: string; moi?: string }) {
  const dep = depart(d.departement);
  return (
    <Link
      href={`/demande/${d.id}`}
      className="block rounded-carte bg-blanc p-4 shadow-[0_1px_3px_rgba(59,51,48,0.08)] ring-1 ring-or-clair/40 active:bg-creme-fonce/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-lg font-medium leading-snug">{metier}</p>
          <p className="mt-0.5 font-medium text-or-fonce">{dateCourte(d.date_mariage)}</p>
        </div>
        <Pastille statut={d.statut} complete={d.complete} />
      </div>
      <p className="mt-2 text-encre">
        📍 {d.lieu} <span className="text-encre-doux">· {dep ? `${dep.code} · ${dep.nom}` : d.departement}</span>
      </p>
      <p className="mt-1 text-sm text-encre-doux">
        {d.invites} invités{d.budget != null && ` · budget ${euros(d.budget)}`}
        {" · "}
        {d.nb_positionnes}/{PLACES_MAX} positionné{d.nb_positionnes > 1 ? "s" : ""}
      </p>
      {(d.je_suis_positionne || d.auteur_id === moi) && (
        <p className="mt-2 text-sm font-medium text-succes">
          {d.auteur_id === moi ? "Ma demande" : "✓ Vous êtes positionné(e)"}
        </p>
      )}
    </Link>
  );
}
