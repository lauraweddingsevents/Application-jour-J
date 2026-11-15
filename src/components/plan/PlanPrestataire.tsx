"use client";
// Plan de salle dans le lien d'un intervenant (Ma Coordo), adapté à son métier.
// La base n'envoie que ce dont il a besoin : les noms des invités ne sont
// transmis qu'aux liens « coordination ».
import { useEffect, useMemo, useState } from "react";
import { Carte } from "@/components/ui/Carte";
import { Canevas } from "@/components/plan/editeur/Canevas";
import { supabaseAnonyme } from "@/lib/supabase/anonyme";
import { avecMemoire } from "@/lib/memoire";
import { ilYa } from "@/lib/temps";
import type { VuePlan } from "@/lib/vuesPlan";
import { compteMenus, estTable, places, pluriel, texteMenus } from "@/plan/moteur";
import { normaliser } from "@/plan/normaliser";
import { MENUS, type Element, type Invite, type PlanContenu, type Table } from "@/plan/types";

export type PlanIntervenant = { id: string; nom: string; updated_at: string; contenu: PlanContenu };
export type DonneesPlanIntervenant = { vue: VuePlan; plans: PlanIntervenant[] };

/** Plans du mariage pour ce lien (rechargés à chaque mise à jour du déroulé) */
export function usePlanIntervenant(jeton: string, chargeLe: number) {
  const [donnees, setDonnees] = useState<DonneesPlanIntervenant | null>(null);
  useEffect(() => {
    avecMemoire(`plan-intervenant:${jeton}`, async () => {
      const { data, error } = await supabaseAnonyme().rpc("plan_intervenant", { p_jeton: jeton });
      if (error) throw error;
      return data as DonneesPlanIntervenant | null;
    })
      .then((d) =>
        setDonnees(d ? { ...d, plans: d.plans.map((p) => ({ ...p, contenu: normaliser(p.contenu) })) } : null),
      )
      .catch(() => {});
  }, [jeton, chargeLe]);
  return donnees;
}

const INTRO: Record<VuePlan, string> = {
  traiteur: "Numéros de tables, couverts et menus particuliers.",
  loueur: "Le matériel à prévoir et son emplacement.",
  decoration: "Les tables, les zones et les notes de décoration.",
  coordination: "Le placement complet, avec le nom des invités.",
  simple: "L'emplacement des tables et des différents espaces.",
  aucune: "",
};

const menuCourt = (g: Invite) => MENUS.find((m) => m.valeur === g.menu)?.court;

export function PlanPrestataire({ donnees }: { donnees: DonneesPlanIntervenant }) {
  const [planId, setPlanId] = useState(donnees.plans[0]?.id);
  const plan = donnees.plans.find((p) => p.id === planId) ?? donnees.plans[0];
  const [selection, setSelection] = useState<string | null>(null);
  const vue = donnees.vue;
  if (!plan) return null;
  const c = plan.contenu;
  const choisi = c.items.find((e) => e.id === selection);

  return (
    <div className="flex flex-col gap-3">
      {donnees.plans.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {donnees.plans.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={p.id === plan.id}
              onClick={() => {
                setPlanId(p.id);
                setSelection(null);
              }}
              className={`min-h-[40px] rounded-full px-4 text-sm ${p.id === plan.id ? "bg-encre text-blanc" : "bg-blanc ring-1 ring-or-clair/60"}`}
            >
              {p.nom}
            </button>
          ))}
        </div>
      )}
      <div>
        <h2 className="font-medium">{plan.nom}</h2>
        <p className="text-sm text-encre-doux">
          {INTRO[vue]} Mis à jour {ilYa(plan.updated_at)}.
        </p>
      </div>

      <div className="relative h-[55dvh] overflow-hidden rounded-carte bg-creme ring-1 ring-or-clair/50">
        <Canevas
          contenu={c}
          enDefaut={new Set()}
          selection={selection}
          peutDeplacer={() => false}
          onChoisir={setSelection}
          onDebutDeplacement={() => {}}
          onDeplacer={() => {}}
          onFinDeplacement={() => {}}
        />
      </div>
      <p className="-mt-1 text-center text-xs text-encre-doux">Touchez une table pour le détail · pincez pour zoomer</p>

      {choisi && <Detail element={choisi} vue={vue} onFermer={() => setSelection(null)} />}

      {vue === "traiteur" && <Traiteur contenu={c} onChoisir={setSelection} />}
      {vue === "loueur" && <Loueur contenu={c} />}
      {vue === "decoration" && <Decoration contenu={c} onChoisir={setSelection} />}
      {vue === "coordination" && <Coordination contenu={c} onChoisir={setSelection} />}
      {vue === "simple" && <ListeTables contenu={c} onChoisir={setSelection} />}
    </div>
  );
}

function Detail({ element: e, vue, onFermer }: { element: Element; vue: VuePlan; onFermer: () => void }) {
  const table = estTable(e) ? e : null;
  return (
    <Carte className="p-4 ring-2 ring-or">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium">{e.name}</p>
          {table && (
            <p className="text-sm text-encre-doux">
              {vue === "traiteur" ? pluriel(table.guests.length, "couvert") : `${table.guests.length} / ${places(table)} places`}
              {" · "}
              {table.type === "round" ? `ronde Ø ${table.d} cm` : `rectangulaire ${table.L} × ${table.W} cm`}
            </p>
          )}
        </div>
        <button type="button" onClick={onFermer} className="h-9 w-9 shrink-0 rounded-full text-encre-doux ring-1 ring-or-clair/60" aria-label="Fermer le détail">
          ✕
        </button>
      </div>
      {table && vue === "traiteur" && <MenusTable invites={table.guests} />}
      {table && vue === "coordination" && (
        <ul className="mt-2 text-sm">
          {table.guests.map((g) => (
            <li key={g.id}>
              · {g.nom}
              {menuCourt(g) && <span className="text-encre-doux"> ({menuCourt(g)}{g.note ? ` : ${g.note}` : ""})</span>}
            </li>
          ))}
        </ul>
      )}
      {e.note && (vue === "decoration" || vue === "coordination") && (
        <p className="mt-2 rounded-xl bg-creme px-3 py-2 text-sm">📝 {e.note}</p>
      )}
    </Carte>
  );
}

function MenusTable({ invites }: { invites: Invite[] }) {
  const menus = compteMenus(invites);
  const precisions = invites.filter((g) => g.note && g.menu && g.menu !== "standard");
  if (!menus.length) return <p className="mt-2 text-sm text-encre-doux">Menus standard uniquement.</p>;
  return (
    <div className="mt-2 text-sm">
      <p>
        <strong>Menus particuliers :</strong> {menus.map((m) => `${m.nombre} ${m.texte}`).join(", ")}
      </p>
      {precisions.map((g) => (
        <p key={g.id} className="text-encre-doux">
          · {menuCourt(g)} : {g.note}
        </p>
      ))}
    </div>
  );
}

const tablesDe = (c: PlanContenu) => c.items.filter(estTable);

function LigneTable({ t, onChoisir, children }: { t: Table; onChoisir: (id: string) => void; children: React.ReactNode }) {
  return (
    <li>
      <button type="button" onClick={() => onChoisir(t.id)} className="flex min-h-[48px] w-full items-center gap-3 border-b border-or-clair/40 py-2 text-left last:border-0">
        <span className="min-w-0 flex-1 font-medium">{t.name}</span>
        <span className="text-right text-sm text-encre-doux">{children}</span>
      </button>
    </li>
  );
}

function Traiteur({ contenu: c, onChoisir }: { contenu: PlanContenu; onChoisir: (id: string) => void }) {
  const tables = tablesDe(c);
  const tous = tables.flatMap((t) => t.guests);
  const nonPlaces = c.nonPlaces ?? [];
  const menus = texteMenus([...tous, ...nonPlaces]);
  return (
    <>
      <Carte className="p-4">
        <p className="text-2xl font-medium">{pluriel(tous.length + nonPlaces.length, "couvert")}</p>
        <p className="text-sm text-encre-doux">
          {pluriel(tables.length, "table")}
          {nonPlaces.length > 0 && ` · dont ${nonPlaces.length} invité${nonPlaces.length > 1 ? "s" : ""} pas encore placé${nonPlaces.length > 1 ? "s" : ""}`}
        </p>
        {menus && (
          <p className="mt-2 text-sm">
            <strong>Menus particuliers :</strong> {menus}
          </p>
        )}
      </Carte>
      <Carte className="p-4">
        <h3 className="font-medium">Par table</h3>
        <ul className="mt-1">
          {tables.map((t) => {
            const m = texteMenus(t.guests);
            return (
              <LigneTable key={t.id} t={t} onChoisir={onChoisir}>
                {pluriel(t.guests.length, "couvert")}
                {m && <span className="block text-or-fonce">{m}</span>}
              </LigneTable>
            );
          })}
        </ul>
      </Carte>
    </>
  );
}

function Loueur({ contenu: c }: { contenu: PlanContenu }) {
  const tables = tablesDe(c);
  const materiel = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of tables) {
      const k = t.type === "round" ? `Table ronde Ø ${t.d} cm` : `Table rectangulaire ${t.L} × ${t.W} cm`;
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return [...m];
  }, [tables]);
  const chaises = tables.reduce((s, t) => s + places(t), 0);
  const autres = c.items.filter((e) => e.type === "zone" || e.type === "estrade");
  const poteaux = c.items.filter((e) => e.type === "pillar").length;
  return (
    <Carte className="p-4">
      <h3 className="font-medium">Matériel</h3>
      <ul className="mt-2 flex flex-col gap-1">
        {materiel.map(([k, n]) => (
          <li key={k}>
            <strong>{n} ×</strong> {k}
          </li>
        ))}
        <li>
          <strong>{chaises} ×</strong> chaises
        </li>
      </ul>
      {autres.length > 0 && (
        <>
          <h3 className="mt-4 font-medium">Espaces</h3>
          <ul className="mt-1 text-sm">
            {autres.map((z) => (
              <li key={z.id}>
                · {z.name}
                {"W" in z && <span className="text-encre-doux"> ({z.L / 100} × {z.W / 100} m)</span>}
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="mt-4 text-sm text-encre-doux">
        Salle : {(c.room.w / 100).toLocaleString("fr-FR")} × {(c.room.h / 100).toLocaleString("fr-FR")} m
        {c.room.points ? " (en L)" : ""}
        {poteaux > 0 && ` · ${pluriel(poteaux, "poteau")}`}
      </p>
    </Carte>
  );
}

function Decoration({ contenu: c, onChoisir }: { contenu: PlanContenu; onChoisir: (id: string) => void }) {
  const avecNote = c.items.filter((e) => e.note);
  const zones = c.items.filter((e) => e.type === "zone" || e.type === "estrade");
  return (
    <>
      <Carte className="p-4">
        <h3 className="font-medium">Notes de décoration</h3>
        {avecNote.length === 0 ? (
          <p className="mt-1 text-sm text-encre-doux">Aucune note pour l&apos;instant.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {avecNote.map((e) => (
              <li key={e.id}>
                <button type="button" onClick={() => onChoisir(e.id)} className="w-full rounded-xl bg-creme px-3 py-2 text-left text-sm">
                  <strong>{e.name}</strong> — {e.note}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Carte>
      <Carte className="p-4">
        <h3 className="font-medium">Tables et espaces</h3>
        <p className="mt-1 text-sm">
          {pluriel(tablesDe(c).length, "table")}
          {zones.length > 0 && ` · ${zones.map((z) => z.name).join(", ")}`}
        </p>
      </Carte>
    </>
  );
}

function Coordination({ contenu: c, onChoisir }: { contenu: PlanContenu; onChoisir: (id: string) => void }) {
  const [cherche, setCherche] = useState("");
  const tables = tablesDe(c);
  const q = cherche.trim().toLowerCase();
  const trouves = q
    ? tables.flatMap((t) => t.guests.filter((g) => g.nom.toLowerCase().includes(q)).map((g) => ({ g, t })))
    : [];
  const nonPlaces = c.nonPlaces ?? [];
  return (
    <>
      <Carte className="p-4">
        <label htmlFor="chercheInvite" className="font-medium">Trouver un invité</label>
        <input
          id="chercheInvite"
          type="search"
          value={cherche}
          onChange={(e) => setCherche(e.target.value)}
          placeholder="Nom de l'invité"
          className="mt-2 min-h-[48px] w-full rounded-2xl bg-creme px-4 ring-1 ring-or-clair focus:outline-none focus:ring-2 focus:ring-or"
          autoComplete="off"
        />
        {q && (
          <ul className="mt-2 text-sm">
            {trouves.length === 0 && <li className="text-encre-doux">Personne à ce nom.</li>}
            {trouves.slice(0, 20).map(({ g, t }) => (
              <li key={g.id}>
                <button type="button" onClick={() => onChoisir(t.id)} className="min-h-[40px] w-full text-left">
                  {g.nom} → <strong>{t.name}</strong>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Carte>
      <Carte className="p-4">
        <h3 className="font-medium">Placement</h3>
        <ul className="mt-1">
          {tables.map((t) => (
            <LigneTable key={t.id} t={t} onChoisir={onChoisir}>
              {t.guests.length} / {places(t)}
            </LigneTable>
          ))}
        </ul>
        {nonPlaces.length > 0 && (
          <p className="mt-3 text-sm text-alerte">
            Pas encore placés : {nonPlaces.map((g) => g.nom).join(", ")}
          </p>
        )}
      </Carte>
    </>
  );
}

function ListeTables({ contenu: c, onChoisir }: { contenu: PlanContenu; onChoisir: (id: string) => void }) {
  return (
    <Carte className="p-4">
      <h3 className="font-medium">Tables</h3>
      <ul className="mt-1">
        {tablesDe(c).map((t) => (
          <LigneTable key={t.id} t={t} onChoisir={onChoisir}>
            {pluriel(places(t), "place")}
          </LigneTable>
        ))}
      </ul>
    </Carte>
  );
}
