"use client";
// Commentaires sur un élément du plan (utile aux décoratrices, au lieu…)
import { useState } from "react";
import { ilYa } from "@/lib/temps";
import type { Commentaire } from "@/lib/partagePlans";

export type ActionsCommentaires = {
  ajouter: (elementId: string | null, texte: string) => Promise<void>;
  regler: (id: string, regle: boolean) => Promise<void>;
  supprimer: (id: string) => Promise<void>;
  monId: string | null;
  peutRegler: boolean; // éditeurs et propriétaires
};

export function ListeCommentaires({
  commentaires,
  elementId,
  actions,
}: {
  commentaires: Commentaire[];
  elementId: string;
  actions: ActionsCommentaires;
}) {
  const [texte, setTexte] = useState("");
  const [voirRegles, setVoirRegles] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const liste = commentaires.filter((c) => c.element_id === elementId);
  const ouverts = liste.filter((c) => !c.regle);
  const regles = liste.filter((c) => c.regle);
  const affiches = voirRegles ? liste : ouverts;

  return (
    <div className="rounded-2xl bg-creme p-3">
      <p className="text-sm font-medium">💬 Commentaires{ouverts.length ? ` (${ouverts.length})` : ""}</p>
      <ul className="mt-2 flex flex-col gap-1.5">
        {affiches.map((c) => (
          <li key={c.id} className={`rounded-xl bg-blanc p-2 text-sm ring-1 ring-or-clair/40 ${c.regle ? "opacity-60" : ""}`}>
            <p className="whitespace-pre-line">{c.texte}</p>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-encre-doux">
              <span>
                {c.auteur_nom ?? "Quelqu'un"} · {ilYa(c.created_at)}
              </span>
              {(actions.peutRegler || c.auteur_id === actions.monId) && (
                <button type="button" onClick={() => actions.regler(c.id, !c.regle)} className="min-h-[32px] text-or-fonce underline underline-offset-4">
                  {c.regle ? "Rouvrir" : "✓ Réglé"}
                </button>
              )}
              {c.auteur_id === actions.monId && (
                <button type="button" onClick={() => actions.supprimer(c.id)} className="min-h-[32px] underline underline-offset-4">
                  Supprimer
                </button>
              )}
            </p>
          </li>
        ))}
      </ul>
      {regles.length > 0 && (
        <button type="button" onClick={() => setVoirRegles(!voirRegles)} className="mt-1 min-h-[32px] text-xs text-encre-doux underline underline-offset-4">
          {voirRegles ? "Masquer les commentaires réglés" : `Voir les ${regles.length} commentaire${regles.length > 1 ? "s" : ""} réglé${regles.length > 1 ? "s" : ""}`}
        </button>
      )}
      <form
        className="mt-2 flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!texte.trim()) return;
          setEnvoi(true);
          try {
            await actions.ajouter(elementId, texte);
            setTexte("");
          } finally {
            setEnvoi(false);
          }
        }}
      >
        <input
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          maxLength={1000}
          placeholder="Ajouter un commentaire…"
          aria-label="Nouveau commentaire"
          className="min-h-[44px] min-w-0 flex-1 rounded-xl bg-blanc px-3 text-sm ring-1 ring-or-clair"
        />
        <button type="submit" disabled={envoi || !texte.trim()} className="min-h-[44px] rounded-xl bg-or px-4 text-sm font-medium text-blanc disabled:opacity-50">
          Envoyer
        </button>
      </form>
    </div>
  );
}
