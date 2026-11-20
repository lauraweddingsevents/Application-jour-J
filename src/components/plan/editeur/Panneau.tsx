"use client";
// Panneau du bas de l'éditeur : ajouter des éléments, ou régler l'élément choisi
import { useState } from "react";
import { ChampNombre } from "./ChampNombre";
import { ListeCommentaires, type ActionsCommentaires } from "./Commentaires";
import type { Commentaire } from "@/lib/partagePlans";
import { ZONES_PRETES, appliquerATouteslesTables, dupliquer, taillesUtilisees, majElement, majInvite, placerInvite, supprimer, supprimerInvite } from "@/plan/actions";
import { uid } from "@/plan/exemple";
import { estTable, places, pluriel, resume, texteMenus, type Alerte } from "@/plan/moteur";
import { MENUS, type Element, type Menu, type PlanContenu, type TypeElement } from "@/plan/types";

type Modifier = (fn: (c: PlanContenu) => PlanContenu, cle?: string) => void;

const AJOUTS: { type: TypeElement; texte: string; icone: string }[] = [
  { type: "round", texte: "Table ronde", icone: "⬤" },
  { type: "rect", texte: "Table rect.", icone: "▬" },
  { type: "zone", texte: "Zone", icone: "⬚" },
  { type: "estrade", texte: "Estrade", icone: "▭" },
  { type: "pillar", texte: "Poteau", icone: "■" },
  { type: "porte", texte: "Porte", icone: "🚪" },
  { type: "fenetre", texte: "Fenêtre", icone: "🪟" },
];

const TITRES: Record<TypeElement, string> = {
  round: "Table ronde", rect: "Table rectangulaire", zone: "Zone", estrade: "Estrade",
  pillar: "Poteau", porte: "Porte", fenetre: "Fenêtre",
};

export function Panneau({
  contenu,
  selection,
  alertes,
  lectureSeule,
  modifier,
  onChoisir,
  onAjouter,
  onImporterInvites,
  commentaires,
  actionsCommentaires,
  modeModele = false,
}: {
  modeModele?: boolean;
  commentaires: Commentaire[];
  actionsCommentaires: ActionsCommentaires | null;
  contenu: PlanContenu;
  selection: Element | null;
  alertes: Alerte[];
  lectureSeule: boolean;
  modifier: Modifier;
  onChoisir: (id: string | null) => void;
  onAjouter: (type: TypeElement) => void;
  onImporterInvites: () => void;
}) {
  if (!selection) {
    return (
      <>
        <Accueil contenu={contenu} alertes={alertes} lectureSeule={lectureSeule} modifier={modifier} onChoisir={onChoisir} onAjouter={onAjouter} onImporterInvites={onImporterInvites} />
        <ARegler contenu={contenu} commentaires={commentaires} onChoisir={onChoisir} />
      </>
    );
  }
  return (
    <>
      <Reglages contenu={contenu} e={selection} alertes={alertes} lectureSeule={lectureSeule} modifier={modifier} onChoisir={onChoisir} modeModele={modeModele} />
      {actionsCommentaires && (
        <div className="mt-3">
          <ListeCommentaires commentaires={commentaires} elementId={selection.id} actions={actionsCommentaires} />
        </div>
      )}
    </>
  );
}

// Commentaires pas encore réglés, tous éléments confondus
function ARegler({ contenu, commentaires, onChoisir }: { contenu: PlanContenu; commentaires: Commentaire[]; onChoisir: (id: string | null) => void }) {
  const ouverts = commentaires.filter((c) => !c.regle && c.element_id && contenu.items.some((e) => e.id === c.element_id));
  if (!ouverts.length) return null;
  return (
    <div className="mt-4">
      <p className="text-sm font-medium">💬 Commentaires à régler ({ouverts.length})</p>
      <ul className="mt-2 flex flex-col gap-1">
        {ouverts.map((c) => (
          <li key={c.id}>
            <button type="button" onClick={() => onChoisir(c.element_id)} className="w-full rounded-xl bg-creme px-3 py-2 text-left text-sm">
              <span className="font-medium">{contenu.items.find((e) => e.id === c.element_id)?.name}</span> · {c.texte}
              <span className="block text-xs text-encre-doux">{c.auteur_nom}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ListeAlertes({ alertes, onChoisir }: { alertes: Alerte[]; onChoisir?: (id: string) => void }) {
  if (!alertes.length) return null;
  return (
    <ul className="mt-2 flex flex-col gap-1 text-sm">
      {alertes.map((a, i) => (
        <li key={i}>
          <button type="button" onClick={() => onChoisir?.(a.ids[0])} className="w-full rounded-xl bg-alerte/10 px-3 py-2 text-left text-alerte">
            {a.texte}
          </button>
        </li>
      ))}
    </ul>
  );
}

function Accueil({
  contenu, alertes, lectureSeule, modifier, onChoisir, onAjouter, onImporterInvites,
}: {
  contenu: PlanContenu; alertes: Alerte[]; lectureSeule: boolean; modifier: Modifier;
  onChoisir: (id: string | null) => void; onAjouter: (t: TypeElement) => void; onImporterInvites: () => void;
}) {
  const r = resume(contenu);
  const nonPlaces = contenu.nonPlaces ?? [];
  return (
    <div>
      {!lectureSeule && (
        <>
          <h3 className="text-sm font-medium">Ajouter</h3>
          <div className="mt-2 grid grid-cols-4 gap-1.5 sm:grid-cols-7">
            {AJOUTS.map((a) => (
              <button
                key={a.type}
                type="button"
                onClick={() => onAjouter(a.type)}
                className="flex min-h-[60px] flex-col items-center justify-center gap-1 rounded-2xl bg-creme px-1 text-[11px] font-medium leading-tight ring-1 ring-or-clair/60"
              >
                <span aria-hidden className="text-base text-or-fonce">{a.icone}</span>
                {a.texte}
              </button>
            ))}
          </div>
        </>
      )}
      <p className="mt-3 text-sm text-encre-doux">
        <strong className="text-encre">{pluriel(r.tables, "table")}</strong> · <strong className="text-encre">{pluriel(r.places, "place")}</strong> ·{" "}
        <strong className="text-encre">{r.invites}</strong> invité{r.invites > 1 ? "s" : ""} placé{r.invites > 1 ? "s" : ""}
        {!lectureSeule && " — touchez un élément pour le régler, glissez-le pour le déplacer."}
      </p>
      <ListeAlertes alertes={alertes} onChoisir={onChoisir} />
      <div className="mt-4 rounded-2xl bg-creme p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium">Invités non placés ({nonPlaces.length})</p>
          {!lectureSeule && (
            <button type="button" onClick={onImporterInvites} className="min-h-[36px] text-sm text-or-fonce underline underline-offset-4">
              Importer une liste
            </button>
          )}
        </div>
        {nonPlaces.length > 0 ? (
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {nonPlaces.map((g) => (
              <li key={g.id} className="flex items-center gap-1 rounded-full bg-blanc py-1 pl-3 pr-1 text-sm ring-1 ring-or-clair/60">
                {g.nom}
                {!lectureSeule && (
                  <button type="button" onClick={() => modifier((c) => supprimerInvite(c, g.id))} aria-label={`Supprimer ${g.nom}`} className="h-6 w-6 rounded-full text-encre-doux">
                    ×
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-xs text-encre-doux">Touchez une table pour y ajouter des invités, ou importez votre liste.</p>
        )}
      </div>
    </div>
  );
}

function Reglages({
  contenu, e, alertes, lectureSeule, modifier, onChoisir, modeModele,
}: {
  contenu: PlanContenu; e: Element; alertes: Alerte[]; lectureSeule: boolean; modifier: Modifier; onChoisir: (id: string | null) => void;
  modeModele: boolean;
}) {
  // Élément fixé par le lieu : modifiable seulement dans la salle modèle elle-même
  const fige = lectureSeule || (!!e.verrou && !modeModele);
  const maj = (champs: Partial<Element>, cle?: string) => modifier((c) => majElement(c, e.id, champs), cle ? `${e.id}:${cle}` : undefined);
  const mesAlertes = alertes.filter((a) => a.ids.includes(e.id));
  const num = (libelle: string, champ: string, pas: number, min: number, max: number, unite?: string) => (
    <ChampNombre
      libelle={libelle}
      valeur={(e as unknown as Record<string, number>)[champ]}
      pas={pas} min={min} max={max} unite={unite} desactive={fige}
      onChange={(v) => maj({ [champ]: v } as Partial<Element>, champ)}
    />
  );
  const puce = (actif: boolean, texte: string, f: () => void) => (
    <button key={texte} type="button" disabled={fige} onClick={f} className={`min-h-[36px] rounded-full px-3 text-xs ring-1 disabled:opacity-60 ${actif ? "bg-or text-blanc ring-or" : "bg-blanc ring-or-clair"}`}>
      {texte}
    </button>
  );

  // « Toutes les tables à cette taille » (utile quand le lieu n'a qu'un modèle de table)
  const autres = contenu.items.filter((x) => x.type === e.type && x.id !== e.id && !x.verrou);
  const toutes = !fige && autres.length > 0 && (
    <button
      type="button"
      onClick={() => modifier((c) => appliquerATouteslesTables(c, e.id))}
      className="min-h-[40px] rounded-full bg-blanc px-4 text-sm text-or-fonce ring-1 ring-or-clair"
    >
      Mettre les {autres.length + 1} tables {e.type === "round" ? "rondes" : "rectangulaires"} à cette taille
    </button>
  );

  let reglages = null;
  if (e.type === "round") {
    reglages = (
      <>
        <div className="flex flex-wrap gap-1.5">
          {[[120, 8], [150, 8], [160, 10], [180, 10], [200, 12]].map(([d, ch]) => puce(e.d === d, `Ø${d}`, () => maj({ d, chairs: ch } as Partial<Element>)))}
          {taillesUtilisees(contenu, "round").map(Number).filter((d) => ![120, 150, 160, 180, 200].includes(d)).map((d) =>
            puce(e.d === d, `Ø${d}`, () => maj({ d } as Partial<Element>)))}
        </div>
        <div className="grid grid-cols-2 gap-2">{num("Diamètre", "d", 10, 60, 300, "cm")}{num("Chaises", "chairs", 1, 0, 20)}</div>
        {toutes}
      </>
    );
  } else if (e.type === "rect") {
    reglages = (
      <>
        <div className="flex flex-wrap gap-1.5">
          {[[120, 80], [180, 80], [200, 100], [240, 80]].map(([L, W]) => puce(e.L === L && e.W === W, `${L}×${W}`, () => maj({ L, W, sides: Math.max(1, Math.round(L / 60)) } as Partial<Element>)))}
          {taillesUtilisees(contenu, "rect").filter((t) => !["120×80", "180×80", "200×100", "240×80"].includes(t)).map((t) => {
            const [L, W] = t.split("×").map(Number);
            return puce(e.L === L && e.W === W, t, () => maj({ L, W, sides: Math.max(1, Math.round(L / 60)) } as Partial<Element>));
          })}
        </div>
        <p className="text-xs text-encre-doux">Taille sur mesure : tapez la longueur et la largeur (ex. 183 × 76).</p>
        <div className="grid grid-cols-2 gap-2">
          {num("Longueur", "L", 10, 60, 1200, "cm")}{num("Largeur", "W", 5, 40, 300, "cm")}
          {num("Chaises par côté", "sides", 1, 0, 30)}{num("Chaises en bout", "ends", 1, 0, 3)}
        </div>
        {toutes}
      </>
    );
  } else if (e.type === "zone") {
    reglages = (
      <>
        <div className="flex flex-wrap gap-1.5">
          {ZONES_PRETES.map(([n, L, W]) => puce(e.name === n, n, () => maj({ name: n, L, W } as Partial<Element>)))}
        </div>
        <div className="grid grid-cols-2 gap-2">{num("Longueur", "L", 10, 50, 3000, "cm")}{num("Largeur", "W", 10, 50, 3000, "cm")}</div>
      </>
    );
  } else if (e.type === "estrade") {
    reglages = <div className="grid grid-cols-2 gap-2">{num("Longueur", "L", 10, 50, 2000, "cm")}{num("Profondeur", "W", 10, 50, 1000, "cm")}</div>;
  } else if (e.type === "pillar") {
    reglages = (
      <>
        <div className="flex gap-1.5">
          {puce(e.shape === "square", "Carré", () => maj({ shape: "square" } as Partial<Element>))}
          {puce(e.shape === "round", "Rond", () => maj({ shape: "round" } as Partial<Element>))}
        </div>
        <div className="grid grid-cols-2 gap-2">{num(e.shape === "round" ? "Diamètre" : "Côté", "L", 5, 10, 200, "cm")}</div>
      </>
    );
  } else if (e.type === "porte") {
    reglages = (
      <>
        <div className="flex flex-wrap gap-1.5">
          {puce(e.L === 90, "Simple 90 cm", () => maj({ L: 90 } as Partial<Element>))}
          {puce(e.L === 140, "Double 140 cm", () => maj({ L: 140 } as Partial<Element>))}
          {puce(e.sens === "gauche", "Ouvre à gauche", () => maj({ sens: "gauche" } as Partial<Element>))}
          {puce(e.sens === "droite", "Ouvre à droite", () => maj({ sens: "droite" } as Partial<Element>))}
        </div>
        <div className="grid grid-cols-2 gap-2">{num("Largeur", "L", 10, 60, 400, "cm")}</div>
        <p className="text-xs text-encre-doux">Placez la porte sur un mur ; tournez-la pour que l&apos;ouverture soit côté salle.</p>
      </>
    );
  } else if (e.type === "fenetre") {
    reglages = <div className="grid grid-cols-2 gap-2">{num("Longueur", "L", 10, 40, 1000, "cm")}</div>;
  }

  const tournable = !(e.type === "round" || (e.type === "pillar" && e.shape === "round"));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-medium">{TITRES[e.type]}</h3>
        <button type="button" onClick={() => onChoisir(null)} className="flex h-9 w-9 items-center justify-center rounded-full bg-creme text-lg text-encre-doux" aria-label="Fermer">
          ×
        </button>
      </div>
      {e.verrou && !modeModele && <p className="rounded-xl bg-or/15 px-3 py-2 text-xs text-or-fonce">🔒 Élément fixé par le lieu de réception : il ne peut pas être modifié.</p>}
      {modeModele && !lectureSeule && (
        <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-creme p-3">
          <input
            type="checkbox"
            checked={!!e.verrou}
            onChange={(ev) => maj({ verrou: ev.target.checked })}
            className="mt-0.5 h-5 w-5 shrink-0 accent-[#A07E5E]"
          />
          <span className="text-sm">
            <span className="block font-medium">🔒 Fixe pour les couples</span>
            <span className="block text-xs text-encre-doux">Les couples ne pourront ni le déplacer, ni le modifier, ni le supprimer.</span>
          </span>
        </label>
      )}
      <input
        value={e.name}
        disabled={fige}
        onChange={(ev) => maj({ name: ev.target.value }, "name")}
        aria-label="Nom"
        className="min-h-[44px] rounded-xl bg-blanc px-3 ring-1 ring-or-clair disabled:opacity-70"
      />
      {reglages}
      <ListeAlertes alertes={mesAlertes} />
      {estTable(e) && <Invites contenu={contenu} table={e} lectureSeule={lectureSeule} modifier={modifier} />}
      {!fige && (
        <div className="flex flex-wrap gap-1.5">
          {tournable && (
            <>
              <BoutonAction onClick={() => maj({ rot: (e.rot - 15 + 360) % 360 })}>↺ 15°</BoutonAction>
              <BoutonAction onClick={() => maj({ rot: (e.rot + 15) % 360 })}>↻ 15°</BoutonAction>
              <BoutonAction onClick={() => maj({ rot: (e.rot + 90) % 360 })}>90°</BoutonAction>
            </>
          )}
          <BoutonAction
            onClick={() => {
              const nouvel = uid();
              modifier((c) => dupliquer(c, e.id, nouvel).contenu);
              onChoisir(nouvel);
            }}
          >
            Dupliquer
          </BoutonAction>
          <BoutonAction
            danger
            onClick={() => {
              modifier((c) => supprimer(c, e.id));
              onChoisir(null);
            }}
          >
            Supprimer
          </BoutonAction>
        </div>
      )}
    </div>
  );
}

function BoutonAction({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button type="button" onClick={onClick} className={`min-h-[40px] rounded-xl px-3 text-sm font-medium ${danger ? "bg-alerte/10 text-alerte" : "bg-creme ring-1 ring-or-clair/60"}`}>
      {children}
    </button>
  );
}

// Invités d'une table : ajout, menu, retrait, et placement des non placés
function Invites({ contenu, table, lectureSeule, modifier }: { contenu: PlanContenu; table: Element; lectureSeule: boolean; modifier: Modifier }) {
  const [nom, setNom] = useState("");
  const [choixNonPlaces, setChoixNonPlaces] = useState(false);
  const nonPlaces = contenu.nonPlaces ?? [];
  const n = places(table);
  const g = table.guests.length;
  const menus = texteMenus(table.guests);

  function ajouter() {
    const noms = nom.split(/[\n,;]/).map((x) => x.trim()).filter(Boolean);
    if (!noms.length) return;
    modifier((c) => majElement(c, table.id, { guests: [...table.guests, ...noms.map((x) => ({ id: uid(), nom: x }))] }));
    setNom("");
  }

  return (
    <div className="rounded-2xl bg-creme p-3">
      <p className={`text-sm font-medium ${g > n ? "text-alerte" : ""}`}>
        Invités : {g} / {n} places{menus && <span className="font-normal text-encre-doux"> · {menus}</span>}
      </p>
      <ul className="mt-2 flex flex-col gap-1.5">
        {table.guests.map((x) => (
          <li key={x.id} className="flex flex-col gap-1 rounded-xl bg-blanc p-2 ring-1 ring-or-clair/40">
            <div className="flex items-center gap-2">
              <input
                value={x.nom}
                disabled={lectureSeule}
                onChange={(ev) => modifier((c) => majInvite(c, x.id, { nom: ev.target.value }), `invite:${x.id}`)}
                aria-label="Nom de l'invité"
                className="min-h-[36px] min-w-0 flex-1 rounded-lg bg-transparent px-1"
              />
              <select
                value={x.menu ?? "standard"}
                disabled={lectureSeule}
                onChange={(ev) => modifier((c) => majInvite(c, x.id, { menu: ev.target.value as Menu }))}
                aria-label={`Menu de ${x.nom}`}
                className="min-h-[36px] max-w-[42%] rounded-lg bg-creme px-1 text-xs"
              >
                {MENUS.map((m) => (
                  <option key={m.valeur} value={m.valeur}>{m.texte}</option>
                ))}
              </select>
              {!lectureSeule && (
                <button type="button" onClick={() => modifier((c) => placerInvite(c, x.id, null))} aria-label={`Retirer ${x.nom} de la table`} title="Retirer de la table" className="h-8 w-8 shrink-0 rounded-full text-encre-doux">
                  ×
                </button>
              )}
            </div>
            {x.menu === "autre" && (
              <input
                value={x.note ?? ""}
                disabled={lectureSeule}
                onChange={(ev) => modifier((c) => majInvite(c, x.id, { note: ev.target.value }), `note:${x.id}`)}
                placeholder="Précisez le menu (sans information médicale)"
                className="min-h-[32px] rounded-lg bg-creme px-2 text-xs"
              />
            )}
          </li>
        ))}
      </ul>
      {!lectureSeule && (
        <>
          <form
            className="mt-2 flex gap-2"
            onSubmit={(ev) => {
              ev.preventDefault();
              ajouter();
            }}
          >
            <input
              value={nom}
              onChange={(ev) => setNom(ev.target.value)}
              placeholder="Ajouter un invité (ou plusieurs, séparés par des virgules)"
              className="min-h-[44px] min-w-0 flex-1 rounded-xl bg-blanc px-3 text-sm ring-1 ring-or-clair"
            />
            <button type="submit" className="min-h-[44px] rounded-xl bg-or px-4 text-sm font-medium text-blanc">Ajouter</button>
          </form>
          {nonPlaces.length > 0 && (
            <div className="mt-2">
              <button type="button" onClick={() => setChoixNonPlaces(!choixNonPlaces)} className="min-h-[36px] text-sm text-or-fonce underline underline-offset-4">
                {choixNonPlaces ? "Masquer" : `Placer des invités non placés (${nonPlaces.length})`}
              </button>
              {choixNonPlaces && (
                <ul className="mt-1 flex flex-wrap gap-1.5">
                  {nonPlaces.map((x) => (
                    <li key={x.id}>
                      <button type="button" onClick={() => modifier((c) => placerInvite(c, x.id, table.id))} className="min-h-[36px] rounded-full bg-blanc px-3 text-sm ring-1 ring-or-clair">
                        + {x.nom}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <p className="mt-2 text-[11px] text-encre-doux">Menus : pour le traiteur. N&apos;indiquez pas d&apos;information médicale (allergies…).</p>
        </>
      )}
    </div>
  );
}
