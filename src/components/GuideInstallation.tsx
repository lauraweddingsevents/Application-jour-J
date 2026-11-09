"use client";
import { useEffect, useState } from "react";

type Appareil = "iphone" | "android" | "autre";
type EvenementInstallation = Event & { prompt: () => Promise<void> };

const CLE_MASQUE = "macoordo:guide-installation-masque";

// Explique comment ajouter Ma Coordo à l'écran d'accueil du téléphone
export function GuideInstallation() {
  const [visible, setVisible] = useState(false);
  const [appareil, setAppareil] = useState<Appareil>("autre");
  const [ouvert, setOuvert] = useState(false);
  const [invite, setInvite] = useState<EvenementInstallation | null>(null);

  useEffect(() => {
    const dejaInstallee =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    let masque = false;
    try {
      masque = localStorage.getItem(CLE_MASQUE) === "1";
    } catch {}
    const ua = navigator.userAgent;
    const ios = /iPhone|iPad|iPod/.test(ua) || (ua.includes("Mac") && "ontouchend" in document);
    // Lecture des informations du téléphone : possible seulement une fois la page affichée
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAppareil(ios ? "iphone" : /Android/.test(ua) ? "android" : "autre");
    setVisible(!dejaInstallee && !masque);

    // Android / Chrome : le navigateur propose lui-même l'installation
    const surInvite = (e: Event) => {
      e.preventDefault();
      setInvite(e as EvenementInstallation);
    };
    window.addEventListener("beforeinstallprompt", surInvite);
    return () => window.removeEventListener("beforeinstallprompt", surInvite);
  }, []);

  if (!visible) return null;

  function masquer() {
    try {
      localStorage.setItem(CLE_MASQUE, "1");
    } catch {}
    setVisible(false);
  }

  return (
    <section className="rounded-carte bg-blanc p-4 ring-1 ring-or-clair/60">
      <div className="flex items-start gap-3">
        <span className="text-2xl" aria-hidden>📲</span>
        <div className="flex-1">
          <p className="font-medium">Gardez votre déroulé à portée de main</p>
          <p className="mt-0.5 text-sm text-encre-doux">
            Ajoutez-le à l&apos;écran d&apos;accueil : il s&apos;ouvrira comme une
            application, même avec peu de réseau.
          </p>
        </div>
      </div>

      {invite ? (
        <button
          type="button"
          onClick={async () => {
            await invite.prompt();
            setInvite(null);
          }}
          className="mt-3 min-h-[48px] w-full rounded-full bg-or text-sm font-medium text-blanc"
        >
          Ajouter à l&apos;écran d&apos;accueil
        </button>
      ) : !ouvert ? (
        <button
          type="button"
          onClick={() => setOuvert(true)}
          className="mt-3 min-h-[48px] w-full rounded-full bg-or text-sm font-medium text-blanc"
        >
          Comment faire ?
        </button>
      ) : (
        <ol className="mt-3 flex flex-col gap-2 rounded-2xl bg-creme p-4 text-sm">
          {appareil === "iphone" ? (
            <>
              <li>1. Ouvrez ce lien dans <strong>Safari</strong>.</li>
              <li>
                2. Touchez le bouton <strong>Partager</strong>{" "}
                <span aria-hidden>(carré avec une flèche vers le haut ⬆️)</span>, en bas de l&apos;écran.
              </li>
              <li>3. Faites défiler et touchez <strong>« Sur l&apos;écran d&apos;accueil »</strong>.</li>
              <li>4. Touchez <strong>Ajouter</strong>.</li>
            </>
          ) : appareil === "android" ? (
            <>
              <li>1. Touchez le menu <strong>⋮</strong> en haut à droite de Chrome.</li>
              <li>
                2. Touchez <strong>« Ajouter à l&apos;écran d&apos;accueil »</strong> ou{" "}
                <strong>« Installer l&apos;application »</strong>.
              </li>
              <li>3. Confirmez.</li>
            </>
          ) : (
            <li>
              Dans le menu de votre navigateur, choisissez « Ajouter à l&apos;écran
              d&apos;accueil » ou « Installer ».
            </li>
          )}
        </ol>
      )}
      <button
        type="button"
        onClick={masquer}
        className="mt-2 min-h-[40px] w-full text-center text-xs text-encre-doux underline underline-offset-4"
      >
        Ne plus afficher
      </button>
    </section>
  );
}
