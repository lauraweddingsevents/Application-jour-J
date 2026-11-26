"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Bouton, Carte, Chargement, EnTetePage, Icones, MessageErreur, Vide } from "@/components/ui";
import { exiger, useAgir, useDonnees, useEspace } from "@/lib/espace";
import { supabaseNavigateur } from "@/lib/supabase/navigateur";
import { ajouterJours, albumOuvert, dateSuppression, formatDate } from "@/lib/calculs";
import type { Media } from "@/lib/types";

const TAILLE_ARCHIVE = 400 * 1024 * 1024; // archives de 400 Mo au plus (téléphones compris)

export function Album() {
  const { couple, droits, t, langue } = useEspace();
  const ta = t.album;
  const ouvert = albumOuvert(couple.date_mariage);
  return (
    <>
      <EnTetePage titre={ta.titre} />
      <div className="flex flex-col gap-4">
        {ouvert || droits.admin ? <Galerie /> : (
          <Carte className="flex flex-col items-center gap-2 py-8 text-center">
            <span className="text-bordeaux">{Icones.album("size-10")}</span>
            <h2 className="font-titre text-[26px] font-semibold">{ta.fermeTitre}</h2>
            <p className="font-semibold text-bordeaux">{ta.ferme(formatDate(ajouterJours(couple.date_mariage, 1), langue, { weekday: "long", day: "numeric", month: "long" }))}</p>
            <p className="max-w-md text-sm leading-relaxed text-doux">{ta.fermeTexte}</p>
          </Carte>
        )}
        <CarteQr />
      </div>
    </>
  );
}

function CarteQr() {
  const { couple, t } = useEspace();
  const ta = t.album;
  const [image, setImage] = useState("");
  const [adresse, setAdresse] = useState("");

  useEffect(() => {
    const url = `${window.location.origin}/invites/${couple.jeton_invites}`;
    QRCode.toDataURL(url, { width: 1024, margin: 2, color: { dark: "#2B1D1F", light: "#FFFFFF" } }).then((img) => {
      setImage(img);
      setAdresse(url);
    });
  }, [couple.jeton_invites]);

  function imprimer() {
    const f = window.open("", "_blank");
    if (!f) return;
    const noms = `${couple.prenom_1} &amp; ${couple.prenom_2}`;
    f.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>QR code · ${noms}</title>
<style>@page{size:A5;margin:12mm}body{font-family:Georgia,serif;color:#2B1D1F;text-align:center;margin:0;padding:24px}
h1{font-size:30px;margin:0 0 6px}p{font-family:Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;margin:0 0 18px}
img{width:70%;max-width:340px}small{font-family:Helvetica,Arial,sans-serif;font-size:10px;color:#6E5F5A}</style></head>
<body><h1>${noms}</h1><p>${couple.langue === "en" ? "Share your photos and videos with us: scan this code!" : "Partagez vos photos et vidéos avec nous : scannez ce code !"}</p>
<img src="${image}" alt="QR code"><p><small>Laura Weddings &amp; Events</small></p>
<script>window.onload=function(){window.print()}</script></body></html>`);
    f.document.close();
  }

  return (
    <Carte className="flex flex-col gap-4 sm:flex-row sm:items-center">
      {/* eslint-disable-next-line @next/next/no-img-element -- image générée dans le navigateur */}
      {image ? <img src={image} alt="QR code" className="size-40 shrink-0 self-center rounded-xl border border-trait bg-white p-2" /> : <div className="size-40 shrink-0 self-center rounded-xl bg-piste" />}
      <div className="flex flex-col gap-2">
        <h2 className="font-titre text-[22px] font-semibold">{ta.qrTitre}</h2>
        <p className="text-sm leading-relaxed text-doux">{ta.qrTexte}</p>
        <p className="break-all text-xs text-doux">{adresse}</p>
        <div className="flex flex-wrap gap-2">
          <a href={image} download={`qr-code-${couple.prenom_1}-${couple.prenom_2}.png`.toLowerCase()} className="inline-flex min-h-11 items-center rounded-xl bg-bordeaux px-4 text-sm font-semibold text-fond">{ta.telechargerImage}</a>
          <Bouton variante="contour" onClick={imprimer} disabled={!image}>{ta.imprimer}</Bouton>
        </div>
      </div>
    </Carte>
  );
}

type MediaSigne = Media & { url: string };

function Galerie() {
  const { couple, droits, t, langue } = useEspace();
  const ta = t.album;
  const { donnees, erreur, recharger } = useDonnees(async () => {
    const medias = (await exiger(supabaseNavigateur().from("medias").select("*").eq("couple_id", couple.id).order("cree_le"))) as Media[];
    const signes: MediaSigne[] = [];
    for (let i = 0; i < medias.length; i += 100) {
      const lot = medias.slice(i, i + 100);
      const { data } = await supabaseNavigateur().storage.from("album").createSignedUrls(lot.map((m) => m.chemin), 3600);
      lot.forEach((m, j) => data?.[j]?.signedUrl && signes.push({ ...m, url: data[j].signedUrl }));
    }
    return signes;
  }, [couple.id]);
  const { agir, erreurAction } = useAgir(recharger, langue);
  const [progression, setProgression] = useState("");

  async function toutTelecharger() {
    if (!donnees?.length) return;
    const { downloadZip } = await import("client-zip");
    const lots: MediaSigne[][] = [[]];
    let taille = 0;
    for (const m of donnees) {
      if (taille + m.taille > TAILLE_ARCHIVE && lots.at(-1)!.length) { lots.push([]); taille = 0; }
      lots.at(-1)!.push(m);
      taille += m.taille;
    }
    try {
      for (let i = 0; i < lots.length; i++) {
        setProgression(ta.preparation(i + 1, lots.length));
        const fichiers = lots[i].map((m, j) => ({ name: `${String(j + 1).padStart(4, "0")}-${m.invite_prenom || "invite"}-${m.chemin.split("/").pop()}`, input: fetch(m.url) }));
        const blob = await downloadZip(await Promise.all(fichiers.map(async (f) => ({ name: f.name, input: await f.input })))).blob();
        const lien = document.createElement("a");
        lien.href = URL.createObjectURL(blob);
        lien.download = `album-${couple.prenom_1}-${couple.prenom_2}${lots.length > 1 ? `-${i + 1}` : ""}.zip`.toLowerCase();
        lien.click();
        setTimeout(() => URL.revokeObjectURL(lien.href), 60000);
      }
    } finally {
      setProgression("");
    }
  }

  async function supprimer(m: MediaSigne) {
    if (!confirm(t.confirmerSuppression)) return;
    await supabaseNavigateur().storage.from("album").remove([m.chemin]);
    await agir(() => supabaseNavigateur().from("medias").delete().eq("id", m.id));
  }

  return (
    <Carte className="flex flex-col gap-3">
      <MessageErreur>{erreur || erreurAction}</MessageErreur>
      {droits.admin && !albumOuvert(couple.date_mariage) && (
        <p className="rounded-xl bg-orange-pale px-3 py-2 text-sm text-orange">Les mariés verront l&apos;album à partir du lendemain du mariage, 10 h. Vous le voyez dès maintenant.</p>
      )}
      {!donnees ? (!erreur && <Chargement texte={t.chargement} />) : donnees.length === 0 ? <Vide>{ta.vide}</Vide> : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-semibold">{ta.nombre(donnees.length)}</span>
            <Bouton onClick={toutTelecharger} disabled={!!progression}>{progression || ta.toutTelecharger}</Bouton>
          </div>
          <p className="text-xs text-doux">{ta.conservation(formatDate(dateSuppression(couple.date_mariage), langue))}</p>
          <ul className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 lg:grid-cols-6">
            {donnees.map((m) => (
              <li key={m.id} className="group relative aspect-square overflow-hidden rounded-lg bg-piste">
                <a href={m.url} target="_blank" rel="noreferrer" title={ta.par(m.invite_prenom || "?")}>
                  {m.type_mime.startsWith("video/") ? (
                    <video src={`${m.url}#t=0.5`} preload="metadata" muted playsInline className="size-full object-cover" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.url} alt={ta.par(m.invite_prenom || "?")} loading="lazy" className="size-full object-cover" />
                  )}
                  {m.type_mime.startsWith("video/") && <span className="absolute bottom-1 left-1 rounded bg-encre/70 px-1.5 text-[10px] font-semibold text-white">▶</span>}
                </a>
                {droits.admin && (
                  <button type="button" onClick={() => supprimer(m)} aria-label={t.supprimer}
                    className="absolute right-1 top-1 flex size-8 items-center justify-center rounded-full bg-white/90 text-rouge opacity-100 sm:opacity-0 sm:group-hover:opacity-100">×</button>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </Carte>
  );
}
