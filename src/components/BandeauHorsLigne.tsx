"use client";
import { useEnLigne } from "@/lib/useEnLigne";

export function BandeauHorsLigne() {
  const enLigne = useEnLigne();
  if (enLigne) return null;
  return (
    <div className="mb-4 rounded-2xl bg-encre px-4 py-3 text-sm text-blanc" role="status">
      📡 Pas de réseau : voici la dernière version enregistrée. Les modifications
      seront possibles au retour du réseau.
    </div>
  );
}
