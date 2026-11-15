"use client";
import Link from "next/link";
import type { Droits } from "@/lib/droits";

// Message affiché quand le compte ne peut plus créer ni modifier
export function BandeauLectureSeule({ droits }: { droits: Droits | null | undefined }) {
  if (!droits || droits.peut_modifier) return null;
  const suspendu = droits.raison === "suspendu";
  return (
    <div className="mt-6 rounded-2xl bg-[#f6ecd6] p-4 text-sm" role="status">
      <p className="font-medium">
        {suspendu ? "Compte suspendu : lecture seule" : "Abonnement inactif : lecture seule"}
      </p>
      <p className="mt-1 text-encre-doux">
        Vos mariages restent consultables, mais vous ne pouvez plus en créer ni les modifier. Le jour J,
        les liens des intervenants, le bouton « retard » et les annonces continuent de fonctionner.
      </p>
      {!suspendu && (
        <Link href="/compte" className="mt-2 inline-block font-medium text-or-fonce underline underline-offset-4">
          Voir mon abonnement
        </Link>
      )}
    </div>
  );
}
