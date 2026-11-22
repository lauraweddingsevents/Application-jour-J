import { couleurStatut, libelleStatut, type StatutDemande } from "@/lib/demandes";

// Étiquette de statut (Ouverte, Complète, Transmise…)
export function Pastille({ statut, complete = false }: { statut: StatutDemande; complete?: boolean }) {
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-3 py-1 text-xs font-medium ${couleurStatut(statut, complete)}`}>
      {libelleStatut(statut, complete)}
    </span>
  );
}
