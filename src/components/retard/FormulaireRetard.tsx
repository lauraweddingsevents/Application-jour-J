"use client";
import { useState } from "react";
import { Bouton } from "@/components/ui/Bouton";
import { Choix } from "@/components/ui/Choix";
import { messageErreur } from "@/lib/erreurs";
import { ajouterMinutes, dureeLisible, heureAffichee } from "@/lib/heures";

type MomentSimple = { id: string; titre: string; debut: string; fin: string | null };

const RETARDS = [5, 10, 15, 20, 30, 45, 60];
const AVANCES = [-5, -10, -15];

// Décaler un moment (et si on veut tous les suivants) en cas de retard
export function FormulaireRetard({
  moment,
  moments,
  tz,
  onValider,
}: {
  moment: MomentSimple;
  moments: MomentSimple[];
  tz: string;
  onValider: (minutes: number, suivants: boolean) => Promise<void>;
}) {
  const [minutes, setMinutes] = useState(15);
  const [suivants, setSuivants] = useState<"oui" | "non">("oui");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState("");

  const lesSuivants = moments.filter((m) => m.id !== moment.id && m.debut > moment.debut);
  const dernier = lesSuivants.at(-1);
  const libelle = (n: number) => (n > 0 ? `+${dureeLisible(n)}` : `−${dureeLisible(-n)}`);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="font-medium">{moment.titre}</p>
        <p className="text-sm text-encre-doux">
          Prévu à {heureAffichee(moment.debut, tz)}
          {moment.fin && ` – ${heureAffichee(moment.fin, tz)}`}
        </p>
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-medium">Combien de retard ?</legend>
        <div className="grid grid-cols-4 gap-2">
          {RETARDS.map((n) => (
            <BoutonDuree key={n} actif={minutes === n} onClick={() => setMinutes(n)}>
              {libelle(n)}
            </BoutonDuree>
          ))}
        </div>
        <p className="mb-2 mt-4 text-sm font-medium">Ou en avance ?</p>
        <div className="grid grid-cols-4 gap-2">
          {AVANCES.map((n) => (
            <BoutonDuree key={n} actif={minutes === n} onClick={() => setMinutes(n)}>
              {libelle(n)}
            </BoutonDuree>
          ))}
        </div>
      </fieldset>

      {lesSuivants.length > 0 && (
        <Choix<"oui" | "non">
          libelle="Que faut-il décaler ?"
          valeur={suivants}
          onChange={setSuivants}
          options={[
            { valeur: "oui", texte: `Avec la suite (${lesSuivants.length})` },
            { valeur: "non", texte: "Ce moment seul" },
          ]}
        />
      )}

      <div className="rounded-2xl bg-blanc p-4 text-sm ring-1 ring-or-clair">
        <p>
          <strong className="font-medium">{moment.titre}</strong> :{" "}
          {heureAffichee(moment.debut, tz)} → {heureAffichee(ajouterMinutes(moment.debut, minutes), tz)}
        </p>
        {suivants === "oui" && dernier && (
          <p className="mt-1 text-encre-doux">
            Et {lesSuivants.length} moment{lesSuivants.length > 1 ? "s" : ""} suivant
            {lesSuivants.length > 1 ? "s" : ""}, jusqu&apos;à « {dernier.titre} » :{" "}
            {heureAffichee(dernier.debut, tz)} → {heureAffichee(ajouterMinutes(dernier.debut, minutes), tz)}
          </p>
        )}
        <p className="mt-2 text-xs text-encre-doux">
          Tous les intervenants voient le changement immédiatement sur leur lien.
        </p>
      </div>

      {erreur && <p className="text-sm text-alerte">{erreur}</p>}
      <Bouton
        disabled={enCours}
        onClick={async () => {
          setErreur("");
          setEnCours(true);
          try {
            await onValider(minutes, suivants === "oui" && lesSuivants.length > 0);
          } catch (e) {
            setErreur(messageErreur(e as Error));
            setEnCours(false);
          }
        }}
      >
        {enCours ? "Décalage en cours…" : `Décaler de ${libelle(minutes).replace("+", "")}`}
      </Bouton>
    </div>
  );
}

function BoutonDuree({
  actif,
  onClick,
  children,
}: {
  actif: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={actif}
      onClick={onClick}
      className={`min-h-[52px] rounded-2xl text-sm font-medium transition-colors ${
        actif ? "bg-or text-blanc" : "bg-blanc text-encre ring-1 ring-or-clair"
      }`}
    >
      {children}
    </button>
  );
}
