"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Carte } from "@/components/ui/Carte";
import { EnTete } from "@/components/EnTete";
import { Protege } from "@/components/Protege";
import { lireMariage } from "@/lib/donnees";
import { dateLongue, libelleCompteARebours } from "@/lib/dates";
import { estIdentifiantInvalide, messageErreur } from "@/lib/erreurs";
import { nomMariage, type Mariage } from "@/lib/types";
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
  const params = useSearchParams();
  const router = useRouter();
  const [mariage, setMariage] = useState<Mariage | null | undefined>(undefined);
  const [erreur, setErreur] = useState("");

  const ongletDemande = params.get("onglet") as Onglet | null;
  const onglet: Onglet = ONGLETS.some((o) => o.id === ongletDemande)
    ? (ongletDemande as Onglet)
    : "deroule";

  const changerOnglet = (o: Onglet) =>
    router.replace(`/mariage/${id}?onglet=${o}`, { scroll: false });

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

      <div className="mt-4">
        {onglet === "intervenants" && <Intervenants mariage={mariage} />}
        {onglet === "reglages" && <Reglages mariage={mariage} onModifie={setMariage} />}
        {onglet === "deroule" && (
          <BientotDisponible texte="Le déroulé (moments, horaires, lieux) arrive à la prochaine étape." />
        )}
        {onglet === "fiche" && (
          <BientotDisponible texte="La fiche pratique (contacts, adresses, plan B météo) arrive très bientôt." />
        )}
      </div>
    </main>
  );
}

function BientotDisponible({ texte }: { texte: string }) {
  return (
    <Carte className="text-center">
      <p className="text-3xl" aria-hidden>🕊️</p>
      <p className="mt-2 text-encre-doux">{texte}</p>
    </Carte>
  );
}
