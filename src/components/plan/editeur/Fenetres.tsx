"use client";
// Fenêtres de l'éditeur : la salle, le récapitulatif, l'import d'invités,
// l'historique des versions, l'image du plan.
import { useEffect, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Bouton } from "@/components/ui/Bouton";
import { Champ } from "@/components/ui/Champ";
import { Choix } from "@/components/ui/Choix";
import { Selecteur } from "@/components/ui/Selecteur";
import { ZoneTexte } from "@/components/ui/ZoneTexte";
import { DessinPlan } from "@/components/plan/DessinPlan";
import { listerVersions, lireVersion, nommerVersion, type VersionPlan } from "@/lib/plans";
import { ilYa } from "@/lib/temps";
import { messageErreur } from "@/lib/erreurs";
import { uid } from "@/plan/exemple";
import { lireListeInvites, recapitulatif, trouverTable } from "@/plan/moteur";
import { lireSalleEnL, salleEnL, surfaceSalle, contourSalle, type CoinL } from "@/plan/salle";
import type { Element, PlanContenu } from "@/plan/types";

type Modifier = (fn: (c: PlanContenu) => PlanContenu, cle?: string) => void;

// ---------- La salle ----------
export function FenetreSalle({
  contenu,
  modifier,
  onFini,
  structureFixe = false,
}: {
  contenu: PlanContenu;
  modifier: Modifier;
  onFini: () => void;
  structureFixe?: boolean;
}) {
  const enL = lireSalleEnL(contenu.room);
  const [forme, setForme] = useState<"rect" | "L">(contenu.room.points ? "L" : "rect");
  const [w, setW] = useState(String(contenu.room.w / 100));
  const [h, setH] = useState(String(contenu.room.h / 100));
  const [dw, setDw] = useState(String((enL?.dw ?? Math.round(contenu.room.w / 3)) / 100));
  const [dh, setDh] = useState(String((enL?.dh ?? Math.round(contenu.room.h / 3)) / 100));
  const [coin, setCoin] = useState<CoinL>(enL?.coin ?? "haut-droite");
  const [passage, setPassage] = useState(String(contenu.passage));
  const m = (t: string) => Math.round(parseFloat(t.replace(",", ".")) * 100);

  const salle = (() => {
    const W = m(w), H = m(h);
    if (!(W > 0 && H > 0)) return contenu.room;
    return forme === "L" ? salleEnL(W, H, m(dw) || 100, m(dh) || 100, coin) : { w: W, h: H };
  })();

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const p = parseInt(passage, 10);
        modifier((c) => ({ ...c, room: structureFixe ? c.room : salle, passage: p >= 0 ? p : c.passage }));
        onFini();
      }}
    >
      {structureFixe && (
        <p className="rounded-xl bg-or/15 px-3 py-2 text-sm text-or-fonce">
          🔒 La forme et les dimensions de la salle sont fixées par le lieu de réception.
        </p>
      )}
      <fieldset disabled={structureFixe} className="flex flex-col gap-4 disabled:opacity-60">
      <Choix<"rect" | "L">
        libelle="Forme de la salle"
        valeur={forme}
        onChange={setForme}
        options={[
          { valeur: "rect", texte: "Rectangle" },
          { valeur: "L", texte: "En L" },
        ]}
      />
      <div className="grid grid-cols-2 gap-3">
        <Champ id="w" libelle="Largeur totale (m)" inputMode="decimal" value={w} onChange={(e) => setW(e.target.value)} />
        <Champ id="h" libelle="Longueur totale (m)" inputMode="decimal" value={h} onChange={(e) => setH(e.target.value)} />
      </div>
      {forme === "L" && (
        <>
          <Selecteur id="coin" libelle="Coin retiré" value={coin} onChange={(e) => setCoin(e.target.value as CoinL)}>
            <option value="haut-droite">En haut à droite</option>
            <option value="haut-gauche">En haut à gauche</option>
            <option value="bas-droite">En bas à droite</option>
            <option value="bas-gauche">En bas à gauche</option>
          </Selecteur>
          <div className="grid grid-cols-2 gap-3">
            <Champ id="dw" libelle="Largeur retirée (m)" inputMode="decimal" value={dw} onChange={(e) => setDw(e.target.value)} />
            <Champ id="dh" libelle="Longueur retirée (m)" inputMode="decimal" value={dh} onChange={(e) => setDh(e.target.value)} />
          </div>
        </>
      )}
      <div className="rounded-2xl bg-blanc p-2 ring-1 ring-or-clair/50">
        <DessinPlan plan={{ ...contenu, room: salle, items: [] }} className="mx-auto h-auto max-h-48 w-full" />
        <p className="text-center text-xs text-encre-doux">
          Surface : {surfaceSalle(contourSalle(salle)).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} m²
        </p>
      </div>
      </fieldset>
      <Champ
        id="passage"
        libelle="Passage minimum entre les tables, chaises comprises (cm)"
        inputMode="numeric"
        value={passage}
        onChange={(e) => setPassage(e.target.value)}
        aide="90 cm est confortable pour le service ; 120 cm pour un passage de fauteuil roulant."
      />
      <Bouton type="submit">Enregistrer</Bouton>
    </form>
  );
}

// ---------- Récapitulatif ----------
export function FenetreRecap({ contenu, planId }: { contenu: PlanContenu; planId: string }) {
  const texte = recapitulatif(contenu);
  const [copie, setCopie] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-encre-doux">Matériel, menus et placement : à envoyer au traiteur, au loueur ou aux mariés.</p>
      <pre className="max-h-[50dvh] overflow-auto whitespace-pre-wrap rounded-2xl bg-blanc p-3 text-xs leading-relaxed ring-1 ring-or-clair/50">{texte}</pre>
      <Bouton
        onClick={async () => {
          await navigator.clipboard.writeText(texte).catch(() => {});
          setCopie(true);
          setTimeout(() => setCopie(false), 2000);
        }}
      >
        {copie ? "✓ Copié" : "Copier le texte"}
      </Bouton>
      <a href={`/plans/${planId}/imprimer`} className="text-center text-sm text-or-fonce underline underline-offset-4">
        Version imprimable / PDF (plan + récapitulatif)
      </a>
    </div>
  );
}

// ---------- Import d'une liste d'invités ----------
export function FenetreImport({ contenu, modifier, onFini }: { contenu: PlanContenu; modifier: Modifier; onFini: () => void }) {
  const [texte, setTexte] = useState("");
  const liste = lireListeInvites(texte);
  const avecTable = liste.filter((i) => i.table && trouverTable(contenu, i.table)).length;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-encre-doux">
        Collez votre liste (depuis Excel, Google Sheets, un e-mail…) ou choisissez un fichier CSV. Une ligne par invité :
        <br />
        <code className="text-xs">Nom</code> ou <code className="text-xs">Nom ; Table ; Menu</code>
      </p>
      <input
        type="file"
        accept=".csv,.txt,text/csv,text/plain"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (f) setTexte(await f.text());
        }}
        className="text-sm"
      />
      <ZoneTexte id="liste" libelle="Liste des invités" rows={8} value={texte} onChange={(e) => setTexte(e.target.value)} placeholder={"Marie Dupont;3;végétarien\nPaul Martin;Table 1\nLéa Durand"} />
      {liste.length > 0 && (
        <p className="text-sm">
          {liste.length} invité{liste.length > 1 ? "s" : ""} trouvé{liste.length > 1 ? "s" : ""}
          {avecTable > 0 && ` · ${avecTable} placé${avecTable > 1 ? "s" : ""} directement à leur table`}
          {liste.length - avecTable > 0 && ` · ${liste.length - avecTable} dans « non placés »`}
        </p>
      )}
      <Bouton
        disabled={!liste.length}
        onClick={() => {
          modifier((c) => {
            const items = c.items.map((e) => ({ ...e, guests: [...e.guests] }) as Element);
            const nonPlaces = [...(c.nonPlaces ?? [])];
            for (const i of liste) {
              const invite = { id: uid(), nom: i.nom, ...(i.menu && i.menu !== "standard" ? { menu: i.menu } : {}) };
              const t = i.table ? trouverTable({ ...c, items }, i.table) : undefined;
              if (t) items.find((e) => e.id === t.id)!.guests.push(invite);
              else nonPlaces.push(invite);
            }
            return { ...c, items, nonPlaces };
          });
          onFini();
        }}
      >
        Importer
      </Bouton>
    </div>
  );
}

// ---------- Historique des versions ----------
export function FenetreHistorique({
  planId,
  versionActuelle,
  contenu,
  lectureSeule,
  onRestaurer,
}: {
  planId: string;
  versionActuelle: () => number;
  contenu: PlanContenu;
  lectureSeule: boolean;
  onRestaurer: (c: PlanContenu) => void;
}) {
  const [versions, setVersions] = useState<VersionPlan[] | null>(null);
  const [libelle, setLibelle] = useState("");
  const [apercu, setApercu] = useState<{ v: VersionPlan; c: PlanContenu } | null>(null);
  const [erreur, setErreur] = useState("");
  const charger = () => listerVersions(planId).then(setVersions);
  useEffect(() => {
    listerVersions(planId).then(setVersions);
  }, [planId]);

  if (apercu) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm">
          {apercu.v.libelle ? `« ${apercu.v.libelle} »` : `Version du ${new Date(apercu.v.created_at).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" })}`}
        </p>
        <div className="rounded-2xl bg-blanc p-2 ring-1 ring-or-clair/50">
          <DessinPlan plan={apercu.c} className="h-auto w-full" />
        </div>
        {!lectureSeule && (
          <Bouton onClick={() => onRestaurer(apercu.c)}>Revenir à cette version</Bouton>
        )}
        <p className="text-xs text-encre-doux">La version actuelle reste dans l&apos;historique : vous pourrez y revenir.</p>
        <Bouton variante="discret" onClick={() => setApercu(null)}>Retour à la liste</Bouton>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {!lectureSeule && (
        <form
          className="flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            setErreur("");
            try {
              await nommerVersion(planId, versionActuelle(), contenu, libelle);
              setLibelle("");
              charger();
            } catch (err) {
              setErreur(messageErreur(err as Error));
            }
          }}
        >
          <input
            value={libelle}
            onChange={(e) => setLibelle(e.target.value)}
            placeholder="Nommer la version actuelle (ex. « Avant la visite du lieu »)"
            className="min-h-[48px] min-w-0 flex-1 rounded-xl bg-blanc px-3 text-sm ring-1 ring-or-clair"
          />
          <Bouton type="submit" variante="secondaire" disabled={!libelle.trim()}>Garder</Bouton>
        </form>
      )}
      {erreur && <p className="text-sm text-alerte">{erreur}</p>}
      <p className="text-xs text-encre-doux">Une copie est aussi gardée automatiquement au moins tous les quarts d&apos;heure de travail.</p>
      {versions === null && <p className="text-sm text-encre-doux">Chargement…</p>}
      {versions?.length === 0 && <p className="text-sm text-encre-doux">Pas encore de version précédente.</p>}
      <ul className="flex flex-col gap-1.5">
        {versions?.map((v) => (
          <li key={v.id}>
            <button
              type="button"
              onClick={async () => setApercu({ v, c: await lireVersion(v.id) })}
              className="flex w-full items-center justify-between gap-3 rounded-xl bg-blanc px-3 py-2.5 text-left text-sm ring-1 ring-or-clair/50"
            >
              <span>
                {v.libelle ? <strong className="font-medium">{v.libelle}</strong> : "Copie automatique"}
                {v.auteur_nom && <span className="text-encre-doux"> · {v.auteur_nom}</span>}
              </span>
              <span className="shrink-0 text-xs text-encre-doux">{ilYa(v.created_at)}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------- Image du plan ----------
export function FenetreImage({ contenu }: { contenu: PlanContenu }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let annule = false;
    const svg = renderToStaticMarkup(<DessinPlan plan={contenu} />).replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" ');
    const vb = /viewBox="([^"]+)"/.exec(svg)?.[1].split(" ").map(Number) ?? [0, 0, 1000, 1000];
    const largeur = 1800;
    const hauteur = Math.round((largeur * vb[3]) / vb[2]);
    const src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = largeur;
      c.height = hauteur;
      const ctx = c.getContext("2d")!;
      ctx.fillStyle = "#f6f1ea";
      ctx.fillRect(0, 0, largeur, hauteur);
      ctx.drawImage(img, 0, 0, largeur, hauteur);
      if (!annule) setUrl(c.toDataURL("image/png"));
    };
    img.onerror = () => !annule && setUrl(src);
    img.src = src;
    return () => {
      annule = true;
    };
  }, [contenu]);

  const nomFichier = `${contenu.name.replace(/[^\p{L}\p{N} -]/gu, "").trim() || "plan"}.png`;
  return (
    <div className="flex flex-col gap-3">
      {!url ? (
        <p className="text-sm text-encre-doux">Préparation de l&apos;image…</p>
      ) : (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="Plan de salle" className="w-full rounded-xl ring-1 ring-or-clair/50" />
          <a href={url} download={nomFichier} className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-or px-6 font-medium text-blanc">
            Télécharger l&apos;image
          </a>
          <p className="text-center text-xs text-encre-doux">Sur téléphone, vous pouvez aussi appuyer longuement sur l&apos;image pour l&apos;enregistrer ou la partager.</p>
        </>
      )}
    </div>
  );
}
