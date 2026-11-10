"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { EnTete } from "@/components/EnTete";
import { Protege } from "@/components/Protege";
import { creerAnnonce, lireMariage, listerAnnonces } from "@/lib/donnees";
import { Feuille } from "@/components/ui/Feuille";
import { FormulaireAnnonce } from "@/components/annonces/FormulaireAnnonce";
import { useEnLigne } from "@/lib/useEnLigne";
import type { Annonce } from "@/lib/types";
import { dateLongue, libelleCompteARebours } from "@/lib/dates";
import { estIdentifiantInvalide, messageErreur } from "@/lib/erreurs";
import { nomMariage, type Mariage } from "@/lib/types";
import { Deroule } from "./Deroule";
import { Fiche } from "./Fiche";
import { Intervenants } from "./Intervenants";
import { Reglages } from "./Reglages";

const ONGLETS = [
  { id: "deroule", texte: "Déroulé" },
  { id: "intervenants", texte: "Intervenants" },
  { id: "fiche", texte: "Fiche pratique" },
  { id: "reglages", texte: "Réglages" },
] as const;
type Onglet = (typeof ONGLETS)[number]["id"];

export function EspaceMariage() {
  return (
    <Protege>
      <Contenu />
    </Protege>
  );
}

function Contenu() {
  const { id } = useParams<{ id: string }>();
  const [mariage, setMariage] = useState<Mariage | null | undefined>(undefined);
  const [erreur, setErreur] = useState("");
  // L'onglet est lu dans l'adresse par le téléphone lui-même (pas par le serveur),
  // pour que la page fonctionne aussi sans réseau.
  const [onglet, setOnglet] = useState<Onglet>("deroule");
  useEffect(() => {
    const demande = new URLSearchParams(window.location.search).get("onglet");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (ONGLETS.some((o) => o.id === demande)) setOnglet(demande as Onglet);
  }, []);

  const enLigne = useEnLigne();
  const [feuilleAnnonce, setFeuilleAnnonce] = useState(false);
  const [annonces, setAnnonces] = useState<Annonce[]>([]);
  const fermerAnnonce = useCallback(() => setFeuilleAnnonce(false), []);
  function ouvrirAnnonce() {
    setFeuilleAnnonce(true);
    listerAnnonces(id).then(setAnnonces);
  }

  const changerOnglet = (o: Onglet) => {
    setOnglet(o);
    window.history.replaceState(null, "", `/mariage/${id}?onglet=${o}`);
  };

  const charger = useCallback(() => {
    lireMariage(id)
      .then(setMariage)
      .catch((e) => (estIdentifiantInvalide(e) ? setMariage(null) : setErreur(messageErreur(e))));
  }, [id]);

  useEffect(charger, [charger]);

  if (erreur) return <p className="mt-20 px-4 text-center text-alerte">{erreur}</p>;
  if (mariage === undefined)
    return <p className="mt-20 text-center text-encre-doux">Chargement…</p>;
  if (mariage === null)
    return (
      <main className="mx-auto w-full max-w-xl px-4 py-6">
        <EnTete retour={{ href: "/tableau", texte: "Mes mariages" }} />
        <p className="mt-10 text-center">Ce mariage est introuvable.</p>
      </main>
    );

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-6">
      <EnTete retour={{ href: "/tableau", texte: "Mes mariages" }} />

      <div className="mt-6">
        <h1 className="text-2xl font-medium">{nomMariage(mariage)}</h1>
        <p className="mt-1 text-encre-doux first-letter:uppercase">
          {dateLongue(mariage.date_mariage)} · {libelleCompteARebours(mariage.date_mariage)}
        </p>
        {mariage.lieu_principal && (
          <p className="text-encre-doux">{mariage.lieu_principal}</p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={ouvrirAnnonce}
            disabled={!enLigne}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-full bg-or px-4 text-sm font-medium text-blanc disabled:opacity-50"
          >
            📣 Annoncer
          </button>
          <Link
            href={`/mariage/${mariage.id}/imprimer`}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-full bg-blanc px-4 text-sm text-or-fonce ring-1 ring-or-clair"
          >
            🖨 Imprimable / PDF
          </Link>
        </div>
      </div>

      <nav
        className="sticky top-0 z-10 -mx-4 mt-6 overflow-x-auto bg-creme/95 px-4 py-2 backdrop-blur"
        aria-label="Sections du mariage"
      >
        <div className="flex gap-2">
          {ONGLETS.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => changerOnglet(o.id)}
              aria-current={onglet === o.id ? "page" : undefined}
              className={`min-h-[44px] shrink-0 rounded-full px-4 text-sm font-medium transition-colors ${
                onglet === o.id
                  ? "bg-encre text-blanc"
                  : "bg-blanc text-encre-doux ring-1 ring-or-clair/60"
              }`}
            >
              {o.texte}
            </button>
          ))}
        </div>
      </nav>

      <Feuille titre="Faire une annonce" ouverte={feuilleAnnonce} onFermer={fermerAnnonce}>
        <FormulaireAnnonce
          recentes={annonces}
          onEnvoyer={async (texte) => {
            await creerAnnonce(mariage.id, texte);
            setAnnonces(await listerAnnonces(mariage.id));
          }}
        />
      </Feuille>

      <div className="mt-4">
        {onglet === "intervenants" && <Intervenants mariage={mariage} />}
        {onglet === "reglages" && <Reglages mariage={mariage} onModifie={setMariage} />}
        {onglet === "deroule" && <Deroule mariage={mariage} />}
        {onglet === "fiche" && <Fiche mariage={mariage} />}
      </div>
    </main>
  );
}
