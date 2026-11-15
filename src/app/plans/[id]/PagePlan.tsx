"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Protege } from "@/components/Protege";
import { EnTetePlan } from "@/components/plan/EnTetePlan";
import { Editeur } from "@/components/plan/editeur/Editeur";
import { estIdentifiantInvalide, messageErreur } from "@/lib/erreurs";
import { lirePlan } from "@/lib/plans";
import type { Plan } from "@/plan/types";

// Page d'un plan : l'éditeur (ou la consultation, pour un lecteur)
export function PagePlan() {
  return (
    <Protege connexion="/plans/connexion">
      <Contenu />
    </Protege>
  );
}

function Contenu() {
  const { id } = useParams<{ id: string }>();
  const [plan, setPlan] = useState<Plan | null | undefined>(undefined);
  const [erreur, setErreur] = useState("");

  // Ouvert depuis un mariage de Ma Coordo : le bouton retour y ramène
  const [retour, setRetour] = useState({ href: "/plans", texte: "Mes plans" });
  const [partage, setPartage] = useState(false);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const depuis = q.get("depuis");
    /* eslint-disable react-hooks/set-state-in-effect */
    if (depuis && /^[0-9a-f-]{36}$/.test(depuis)) setRetour({ href: `/mariage/${depuis}?onglet=plan`, texte: "Retour au mariage" });
    setPartage(q.get("partage") === "1");
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    lirePlan(id)
      .then(setPlan)
      .catch((e) => (estIdentifiantInvalide(e) ? setPlan(null) : setErreur(messageErreur(e))));
  }, [id]);

  if (erreur) return <p className="mt-20 px-4 text-center text-alerte">{erreur}</p>;
  if (plan === undefined) return <p className="mt-20 text-center text-encre-doux">Chargement…</p>;

  if (plan === null)
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        <EnTetePlan retour={retour} />
        <p className="mt-10 text-center">Ce plan est introuvable, ou vous n&apos;y avez pas accès.</p>
      </main>
    );
  return <Editeur plan={plan} retour={retour} partageInitial={partage} />;
}
