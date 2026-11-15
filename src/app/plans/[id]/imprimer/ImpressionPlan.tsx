"use client";
// Version imprimable / PDF d'un plan : le plan sur une page, puis le récapitulatif
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Protege } from "@/components/Protege";
import { DessinPlan } from "@/components/plan/DessinPlan";
import { lirePlan } from "@/lib/plans";
import { estTable, places, pluriel, resume, texteMenus } from "@/plan/moteur";
import { MENUS, type Plan } from "@/plan/types";

export function ImpressionPlan() {
  return (
    <Protege connexion="/plans/connexion">
      <Contenu />
    </Protege>
  );
}

function Contenu() {
  const { id } = useParams<{ id: string }>();
  const [plan, setPlan] = useState<Plan | null | undefined>(undefined);
  const [avecNoms, setAvecNoms] = useState(true);
  useEffect(() => {
    lirePlan(id).then(setPlan).catch(() => setPlan(null));
  }, [id]);
  if (plan === undefined) return <p className="mt-20 text-center text-encre-doux">Chargement…</p>;
  if (plan === null) return <p className="mt-20 text-center">Ce plan est introuvable.</p>;

  const c = plan.contenu;
  const r = resume(c);
  const tables = c.items.filter(estTable);
  const materiel = new Map<string, number>();
  for (const t of tables) {
    const k = t.type === "round" ? `Table ronde Ø${t.d} cm` : `Table rectangulaire ${t.L}×${t.W} cm`;
    materiel.set(k, (materiel.get(k) ?? 0) + 1);
  }
  const menus = texteMenus(tables.flatMap((t) => t.guests));

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 print:max-w-none print:p-0">
      <div className="mb-6 flex flex-col gap-3 rounded-carte bg-blanc p-4 ring-1 ring-or-clair/60 print:hidden">
        <Link href={`/plans/${id}`} className="text-sm text-or-fonce">← Retour au plan</Link>
        <p className="text-sm text-encre-doux">Pour un PDF, choisissez « Enregistrer au format PDF » comme imprimante.</p>
        <label className="flex min-h-[40px] items-center gap-2 text-sm">
          <input type="checkbox" checked={avecNoms} onChange={(e) => setAvecNoms(e.target.checked)} className="h-5 w-5 accent-[#A07E5E]" />
          Inclure le nom des invités
        </label>
        <button type="button" onClick={() => window.print()} className="min-h-[52px] rounded-full bg-or px-6 font-medium text-blanc">
          🖨 Imprimer ou enregistrer en PDF
        </button>
      </div>

      <article className="rounded-carte bg-blanc p-6 text-[13px] leading-snug ring-1 ring-or-clair/60 print:rounded-none print:p-0 print:ring-0">
        <header className="border-b border-or pb-2">
          <p className="text-[11px] uppercase tracking-[0.2em] text-or-fonce">Plan de salle</p>
          <h1 className="text-2xl font-medium">{plan.nom}</h1>
          <p className="text-encre-doux">
            {(c.room.w / 100).toLocaleString("fr-FR")} × {(c.room.h / 100).toLocaleString("fr-FR")} m · {pluriel(r.tables, "table")} · {pluriel(r.places, "place")} · {pluriel(r.invites, "invité")}
          </p>
        </header>
        <div className="mt-3 break-after-page">
          <DessinPlan plan={c} className="mx-auto h-auto max-h-[230mm] w-full" />
        </div>

        <section className="mt-6 grid gap-6 sm:grid-cols-2 print:grid-cols-2">
          <div>
            <h2 className="text-sm font-medium uppercase tracking-wider text-or-fonce">Matériel</h2>
            <ul className="mt-1">
              {[...materiel].map(([k, n]) => (
                <li key={k}>{n} × {k}</li>
              ))}
              <li>{r.places} chaises</li>
            </ul>
          </div>
          {menus && (
            <div>
              <h2 className="text-sm font-medium uppercase tracking-wider text-or-fonce">Menus particuliers</h2>
              <p className="mt-1">{menus}</p>
            </div>
          )}
        </section>

        <h2 className="mt-6 text-sm font-medium uppercase tracking-wider text-or-fonce">Tables</h2>
        <div className="mt-2 grid gap-3 sm:grid-cols-2 print:grid-cols-3">
          {tables.map((t) => {
            const m = texteMenus(t.guests);
            return (
              <div key={t.id} className="break-inside-avoid rounded-xl border border-or-clair/60 p-2">
                <p className="font-medium">
                  {t.name} <span className="font-normal text-encre-doux">({t.guests.length}/{places(t)})</span>
                </p>
                {m && <p className="text-[11px] text-encre-doux">{m}</p>}
                {avecNoms && (
                  <ul className="mt-1 text-[12px]">
                    {t.guests.map((g) => (
                      <li key={g.id}>
                        {g.nom}
                        {g.menu && g.menu !== "standard" && <span className="text-encre-doux"> · {MENUS.find((x) => x.valeur === g.menu)?.court}{g.note ? ` : ${g.note}` : ""}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
        <footer className="mt-6 border-t border-or-clair pt-2 text-[10px] text-encre-doux">
          Imprimé le {new Date().toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" })} · Mon plan de salle
        </footer>
      </article>
    </div>
  );
}
