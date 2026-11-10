"use client";
import { useState } from "react";
import { Bouton } from "@/components/ui/Bouton";
import { messageErreur } from "@/lib/erreurs";
import { ilYa } from "@/lib/temps";
import type { Annonce } from "@/lib/types";

// Messages prêts à envoyer en un geste le jour J
export const ANNONCES_PRETES = [
  "La cérémonie commence",
  "La cérémonie est terminée",
  "Les mariés sont en route",
  "Les mariés arrivent",
  "Photo de groupe : tout le monde en place",
  "Le repas est servi",
  "Ouverture de bal dans 5 min",
  "Petit retard, on vous tient informés",
];

export function FormulaireAnnonce({
  recentes,
  onEnvoyer,
}: {
  recentes: Annonce[];
  onEnvoyer: (texte: string) => Promise<void>;
}) {
  const [libre, setLibre] = useState("");
  const [choisie, setChoisie] = useState<string | null>(null);
  const [enCours, setEnCours] = useState<string | null>(null);
  const [envoyee, setEnvoyee] = useState("");
  const [erreur, setErreur] = useState("");

  async function envoyer(texte: string) {
    if (!texte.trim()) return;
    setErreur("");
    setEnvoyee("");
    setEnCours(texte);
    try {
      await onEnvoyer(texte.trim());
      setEnvoyee(texte.trim());
      setLibre("");
      setChoisie(null);
    } catch (e) {
      setErreur(messageErreur(e as Error));
    } finally {
      setEnCours(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-encre-doux">
        Choisissez un message, puis confirmez : tous les intervenants le reçoivent
        sur leur lien et en notification.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {ANNONCES_PRETES.map((t) => (
          <button
            key={t}
            type="button"
            disabled={enCours !== null}
            aria-pressed={choisie === t}
            onClick={() => {
              setEnvoyee("");
              setChoisie(choisie === t ? null : t);
            }}
            className={`min-h-[60px] rounded-2xl px-3 text-left text-sm font-medium leading-snug disabled:opacity-50 ${
              choisie === t ? "bg-or text-blanc" : "bg-blanc ring-1 ring-or-clair"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      {choisie && (
        <Bouton onClick={() => envoyer(choisie)} disabled={enCours !== null}>
          {enCours ? "Envoi…" : `📣 Envoyer « ${choisie} »`}
        </Bouton>
      )}
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          envoyer(libre);
        }}
      >
        <input
          value={libre}
          onChange={(e) => setLibre(e.target.value)}
          maxLength={140}
          placeholder="Autre message…"
          aria-label="Autre message"
          className="min-h-[52px] min-w-0 flex-1 rounded-2xl border border-or-clair bg-blanc px-4 text-base focus:border-or focus:outline-none"
        />
        <Bouton type="submit" disabled={!libre.trim() || enCours !== null} className="px-5">
          Envoyer
        </Bouton>
      </form>
      {envoyee && (
        <p className="rounded-2xl bg-succes/15 px-4 py-3 text-sm text-succes" role="status">
          ✓ « {envoyee} » envoyé à tous les intervenants.
        </p>
      )}
      {erreur && <p className="text-sm text-alerte">{erreur}</p>}
      {recentes.length > 0 && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-encre-doux">Dernières annonces</p>
          <ul className="mt-2 flex flex-col gap-1 text-sm">
            {recentes.slice(0, 5).map((a) => (
              <li key={a.id} className="flex justify-between gap-3">
                <span>{a.texte}</span>
                <span className="shrink-0 text-xs text-encre-doux">{ilYa(a.le)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
