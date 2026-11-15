"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Carte } from "@/components/ui/Carte";
import { Protege } from "@/components/Protege";
import { DessinPlan } from "@/components/plan/DessinPlan";
import { EnTetePlan } from "@/components/plan/EnTetePlan";
import { estIdentifiantInvalide, messageErreur } from "@/lib/erreurs";
import { lirePlan } from "@/lib/plans";
import { ilYa } from "@/lib/temps";
import { alertes, pluriel, resume } from "@/plan/moteur";
import type { Plan } from "@/plan/types";

// Étape 1 : consultation du plan enregistré en ligne.
// L'éditeur complet (glisser-déposer, annuler…) arrive à l'étape 2.
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

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
      <EnTetePlan retour={{ href: "/plans", texte: "Mes plans" }} />
      {plan === null ? (
        <p className="mt-10 text-center">Ce plan est introuvable, ou vous n&apos;y avez pas accès.</p>
      ) : (
        <Detail plan={plan} />
      )}
    </main>
  );
}

function Detail({ plan }: { plan: Plan }) {
  const r = resume(plan.contenu);
  const { enDefaut, messages } = alertes(plan.contenu);
  return (
    <>
      <h1 className="mt-6 text-2xl font-medium">{plan.nom}</h1>
      <p className="mt-1 text-sm text-encre-doux">
        {(plan.contenu.room.w / 100).toLocaleString("fr-FR")} × {(plan.contenu.room.h / 100).toLocaleString("fr-FR")} m ·{" "}
        {pluriel(r.tables, "table")} · {pluriel(r.places, "place")} · {pluriel(r.invites, "invité")} · enregistré {ilYa(plan.updated_at)}
      </p>
      <div className="mt-4 overflow-hidden rounded-carte bg-blanc p-2 ring-1 ring-or-clair/50">
        <DessinPlan plan={plan.contenu} enDefaut={enDefaut} className="h-auto w-full" />
      </div>
      <p className={`mt-3 text-sm font-medium ${messages.length ? "text-alerte" : "text-succes"}`}>
        {messages.length ? `⚠ ${messages.length} alerte${messages.length > 1 ? "s" : ""}` : "✓ Circulation OK"}
      </p>
      {messages.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1 text-sm">
          {messages.map((m, i) => (
            <li key={i} className="rounded-xl bg-alerte/10 px-3 py-2 text-alerte">{m.texte}</li>
          ))}
        </ul>
      )}
      <Carte className="mt-6 text-center text-sm text-encre-doux">
        🛠️ L&apos;éditeur (déplacer les tables, ajouter des invités, annuler…) arrive à la prochaine étape.
        Votre plan est déjà enregistré en ligne.
      </Carte>
    </>
  );
}
