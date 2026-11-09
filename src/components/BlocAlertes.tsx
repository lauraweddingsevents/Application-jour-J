"use client";
import { useEffect, useState } from "react";
import {
  DELAIS,
  activerAlertes,
  desactiverAlertes,
  ecrireDelai,
  envoyerTest,
  estAbonne,
  possibiliteNotifications,
  type Possibilite,
} from "@/lib/alertes";

// Réglage des alertes sur le lien personnel
export function BlocAlertes({
  jeton,
  delai,
  onDelai,
}: {
  jeton: string;
  delai: number;
  onDelai: (d: number) => void;
}) {
  const [possible, setPossible] = useState<Possibilite>("non");
  const [abonne, setAbonne] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    // Lecture des capacités du téléphone : possible seulement une fois la page affichée
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPossible(possibiliteNotifications());
    estAbonne().then(setAbonne);
  }, []);

  async function agir(action: () => Promise<void>, ok: string) {
    setMessage("");
    setEnCours(true);
    try {
      await action();
      setMessage(ok);
    } catch (e) {
      setMessage(
        (e as Error)?.message === "refus"
          ? "Les notifications sont bloquées. Autorisez-les dans les réglages du navigateur pour ce site, puis réessayez."
          : "Ça n'a pas fonctionné. Vérifiez votre connexion et réessayez.",
      );
    } finally {
      setEnCours(false);
    }
  }

  return (
    <section className="rounded-carte bg-blanc p-4 ring-1 ring-or-clair/60">
      <div className="flex items-start gap-3">
        <span className="text-2xl" aria-hidden>🔔</span>
        <div className="flex-1">
          <p className="font-medium">Alertes avant vos moments</p>
          <p className="mt-0.5 text-sm text-encre-doux">
            {abonne
              ? `Activées sur ce téléphone : vous êtes prévenu·e ${delai} min avant chacun de vos moments.`
              : "Votre téléphone vous prévient quelques minutes avant chacun de vos moments."}
          </p>
        </div>
      </div>

      <label className="mt-3 flex items-center justify-between gap-3 text-sm">
        <span>Me prévenir</span>
        <select
          value={delai}
          onChange={async (e) => {
            const d = Number(e.target.value);
            ecrireDelai(jeton, d);
            onDelai(d);
            if (abonne) await agir(() => activerAlertes(jeton, d), `✓ Vous serez prévenu·e ${d} min avant.`);
          }}
          className="min-h-[44px] rounded-full border border-or-clair bg-creme px-4"
        >
          {DELAIS.map((d) => (
            <option key={d} value={d}>
              {d} min avant
            </option>
          ))}
        </select>
      </label>

      {possible === "oui" && !abonne && (
        <button
          type="button"
          disabled={enCours}
          onClick={() =>
            agir(async () => {
              await activerAlertes(jeton, delai);
              setAbonne(true);
            }, "✓ Alertes activées ! Vous pouvez faire un essai ci-dessous.")
          }
          className="mt-3 min-h-[48px] w-full rounded-full bg-or text-sm font-medium text-blanc disabled:opacity-50"
        >
          {enCours ? "Activation…" : "Activer les alertes sur ce téléphone"}
        </button>
      )}

      {possible === "oui" && abonne && (
        <div className="mt-3 flex flex-col gap-2">
          <button
            type="button"
            disabled={enCours}
            onClick={() => agir(() => envoyerTest(jeton), "Alerte de test envoyée : elle arrive dans quelques secondes.")}
            className="min-h-[44px] w-full rounded-full bg-creme text-sm font-medium text-encre ring-1 ring-or-clair"
          >
            Recevoir une alerte de test
          </button>
          <button
            type="button"
            disabled={enCours}
            onClick={() =>
              agir(async () => {
                await desactiverAlertes(jeton);
                setAbonne(false);
              }, "Alertes désactivées sur ce téléphone.")
            }
            className="min-h-[40px] text-xs text-encre-doux underline underline-offset-4"
          >
            Désactiver les alertes
          </button>
        </div>
      )}

      {possible === "iphone-a-installer" && (
        <p className="mt-3 rounded-2xl bg-creme p-3 text-sm">
          📱 Sur iPhone, les alertes ne fonctionnent qu&apos;une fois Ma Coordo
          <strong> ajouté à l&apos;écran d&apos;accueil</strong> (voir ci-dessus).
          Ouvrez-le ensuite depuis l&apos;icône « Jour J » et revenez ici pour les activer.
        </p>
      )}

      {possible === "non" && (
        <p className="mt-3 text-xs text-encre-doux">
          Ce navigateur ne permet pas les notifications : tant que cette page est
          ouverte, le téléphone vibrera et un bandeau s&apos;affichera avant vos moments.
        </p>
      )}

      {message && (
        <p className="mt-3 text-sm text-or-fonce" role="status">
          {message}
        </p>
      )}
    </section>
  );
}
