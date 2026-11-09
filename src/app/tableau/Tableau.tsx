"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bouton } from "@/components/ui/Bouton";
import { Carte } from "@/components/ui/Carte";
import { Feuille } from "@/components/ui/Feuille";
import { EnTete } from "@/components/EnTete";
import { Protege } from "@/components/Protege";
import { FormulaireMariage } from "@/components/mariage/FormulaireMariage";
import { creerMariage, listerMariages } from "@/lib/donnees";
import { dateLongue, joursAvant, libelleCompteARebours } from "@/lib/dates";
import { messageErreur } from "@/lib/erreurs";
import { nomMariage, type Mariage } from "@/lib/types";

export function Tableau() {
  return (
    <Protege>
      <ListeMariages />
    </Protege>
  );
}

function ListeMariages() {
  const router = useRouter();
  const [mariages, setMariages] = useState<Mariage[] | null>(null);
  const [erreur, setErreur] = useState("");
  const [creation, setCreation] = useState(false);
  const fermer = useCallback(() => setCreation(false), []);

  useEffect(() => {
    listerMariages()
      .then(setMariages)
      .catch((e) => setErreur(messageErreur(e)));
  }, []);

  const aVenir = (mariages ?? []).filter((m) => joursAvant(m.date_mariage) >= 0);
  const passes = (mariages ?? []).filter((m) => joursAvant(m.date_mariage) < 0).reverse();

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-6">
      <EnTete />

      <div className="mt-8 flex items-end justify-between gap-4">
        <h1 className="text-2xl font-medium">Mes mariages</h1>
      </div>

      <Bouton className="mt-6 w-full" onClick={() => setCreation(true)}>
        <span aria-hidden className="text-xl leading-none">+</span> Nouveau mariage
      </Bouton>

      {erreur && <p className="mt-6 text-alerte">{erreur}</p>}
      {mariages === null && !erreur && (
        <p className="mt-10 text-center text-encre-doux">Chargement…</p>
      )}

      {mariages?.length === 0 && (
        <Carte className="mt-6 text-center">
          <p className="text-3xl" aria-hidden>💍</p>
          <h2 className="mt-2 font-medium">Aucun mariage pour l&apos;instant</h2>
          <p className="mt-1 text-sm text-encre-doux">
            Créez votre premier mariage pour commencer le déroulé.
          </p>
        </Carte>
      )}

      {aVenir.length > 0 && <ListeCartes titre="À venir" mariages={aVenir} />}
      {passes.length > 0 && <ListeCartes titre="Passés" mariages={passes} discret />}

      <Feuille titre="Nouveau mariage" ouverte={creation} onFermer={fermer}>
        <FormulaireMariage
          texteBouton="Créer le mariage"
          onEnregistrer={async (saisie) => {
            const m = await creerMariage(saisie);
            setCreation(false);
            router.push(`/mariage/${m.id}?onglet=intervenants`);
          }}
        />
      </Feuille>
    </main>
  );
}

function ListeCartes({
  titre,
  mariages,
  discret,
}: {
  titre: string;
  mariages: Mariage[];
  discret?: boolean;
}) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-encre-doux">
        {titre}
      </h2>
      <ul className="flex flex-col gap-3">
        {mariages.map((m) => (
          <li key={m.id}>
            <Link href={`/mariage/${m.id}`} className="block">
              <Carte className={`transition-shadow hover:shadow-md ${discret ? "opacity-70" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-medium">{nomMariage(m)}</p>
                    <p className="mt-0.5 text-sm text-encre-doux first-letter:uppercase">
                      {dateLongue(m.date_mariage)}
                    </p>
                    {m.lieu_principal && (
                      <p className="mt-0.5 text-sm text-encre-doux">{m.lieu_principal}</p>
                    )}
                  </div>
                  <span className="shrink-0 rounded-full bg-creme px-3 py-1 text-xs font-medium text-or-fonce">
                    {libelleCompteARebours(m.date_mariage)}
                  </span>
                </div>
              </Carte>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
