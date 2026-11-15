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
        <EnTetePlan retour={{ href: "/plans", texte: "Mes plans" }} />
        <p className="mt-10 text-center">Ce plan est introuvable, ou vous n&apos;y avez pas accès.</p>
      </main>
    );
  return <Editeur plan={plan} retour={{ href: "/plans", texte: "Mes plans" }} />;
}
