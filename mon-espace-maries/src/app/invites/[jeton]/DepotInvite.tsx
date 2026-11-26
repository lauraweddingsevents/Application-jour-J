"use client";
import { useEffect, useMemo, useState } from "react";
import { Bouton, Icones, MessageErreur } from "@/components/ui";
import { supabaseNavigateur } from "@/lib/supabase/navigateur";
import { dico } from "@/lib/i18n";
import type { Langue } from "@/lib/calculs";

const LIMITE_PHOTO = 25 * 1024 * 1024;
const LIMITE_VIDEO = 300 * 1024 * 1024;
const PAR_ENVOI = 50;

export function DepotInvite({ jeton, langue, noms }: { jeton: string; langue: Langue; noms: string }) {
  const t = dico(langue).invites;
  const [prenom, setPrenom] = useState("");
  const [fichiers, setFichiers] = useState<File[]>([]);
  const [accord, setAccord] = useState(false);
  const [progression, setProgression] = useState("");
  const [erreur, setErreur] = useState("");
  const [envoye, setEnvoye] = useState(false);

  function choisir(liste: FileList | null) {
    setErreur("");
    const valides: File[] = [];
    for (const f of Array.from(liste ?? [])) {
      if (!/^(image|video)\//.test(f.type)) { setErreur(t.format(f.name)); continue; }
      if (f.size > (f.type.startsWith("video/") ? LIMITE_VIDEO : LIMITE_PHOTO)) { setErreur(t.tropLourd(f.name)); continue; }
      valides.push(f);
    }
    setFichiers((avant) => [...avant, ...valides]);
  }

  async function envoyer() {
    setErreur("");
    let echecs = 0;
    const supabase = supabaseNavigateur();
    for (let debut = 0; debut < fichiers.length; debut += PAR_ENVOI) {
      const lot = fichiers.slice(debut, debut + PAR_ENVOI);
      const r = await fetch(`/api/invites/${jeton}/televerser`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consentement: accord, fichiers: lot.map((f) => ({ nom: f.name, type: f.type, taille: f.size })) }),
      });
      const json = await r.json().catch(() => ({}));
      if (!r.ok) { setErreur(json.erreur ?? dico(langue).erreur); setProgression(""); return; }
      const reussis: { chemin: string; type: string; taille: number }[] = [];
      // Deux envois à la fois : plus rapide, sans saturer le réseau du lieu
      let suivant = 0;
      const travailleur = async () => {
        while (suivant < lot.length) {
          const i = suivant++;
          setProgression(t.envoi(debut + i + 1, fichiers.length));
          const { chemin, jeton: jetonEnvoi } = json.liens[i];
          const { error } = await supabase.storage.from("album").uploadToSignedUrl(chemin, jetonEnvoi, lot[i], { contentType: lot[i].type });
          if (error) echecs++;
          else reussis.push({ chemin, type: lot[i].type, taille: lot[i].size });
        }
      };
      await Promise.all([travailleur(), travailleur()]);
      if (reussis.length) {
        await fetch(`/api/invites/${jeton}/confirmer`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prenom, fichiers: reussis }) });
      }
    }
    setProgression("");
    if (echecs) return setErreur(t.echec(echecs));
    setFichiers([]);
    setEnvoye(true);
  }

  if (envoye) {
    return (
      <div className="flex flex-col items-center gap-2.5 rounded-[18px] border border-trait bg-carte px-5 py-7 text-center">
        <span className="font-titre text-[28px] font-semibold text-bordeaux">{t.merciTitre}</span>
        <span className="text-sm leading-relaxed">{t.merciTexte(noms)}</span>
        <Bouton variante="contour" className="mt-1.5" onClick={() => { setEnvoye(false); setAccord(false); }}>{t.encore}</Bouton>
      </div>
    );
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); envoyer(); }}>
      <div className="flex flex-col gap-1.5 rounded-[18px] bg-bordeaux p-5 text-fond">
        <span className="font-titre text-2xl font-semibold">{t.partagezTitre}</span>
        <span className="text-sm leading-relaxed">{t.partagezTexte}</span>
      </div>
      <label className="flex flex-col gap-1.5 text-[13px] text-doux">
        {t.prenom}
        <input value={prenom} onChange={(e) => setPrenom(e.target.value)} maxLength={80} placeholder={t.prenomExemple} autoComplete="given-name"
          className="min-h-[46px] rounded-xl border border-champ bg-white px-3 text-[15px] text-encre focus:border-bordeaux focus:outline-none" />
      </label>
      <label className="flex min-h-[120px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-[1.5px] border-dashed border-bordeaux bg-carte px-4 text-center text-[15px] font-semibold text-bordeaux">
        {Icones.appareil()}
        {fichiers.length ? t.choisis(fichiers.length) : t.ajouter}
        <span className="text-xs font-normal text-doux">{t.ajouterAide}</span>
        <input type="file" accept="image/*,video/*" multiple className="sr-only" onChange={(e) => { choisir(e.target.files); e.target.value = ""; }} />
      </label>
      {fichiers.length > 0 && (
        <ul className="grid grid-cols-4 gap-1.5">
          {fichiers.slice(0, 12).map((f, i) => (
            <li key={i} className="relative aspect-square overflow-hidden rounded-lg bg-piste">
              {f.type.startsWith("image/") ? <Apercu fichier={f} /> : <span className="flex size-full items-center justify-center text-xs text-doux">▶ vidéo</span>}
              <button type="button" aria-label={`Retirer ${f.name}`} onClick={() => setFichiers(fichiers.filter((_, j) => j !== i))}
                className="absolute right-0.5 top-0.5 flex size-7 items-center justify-center rounded-full bg-white/90 text-rouge">×</button>
            </li>
          ))}
          {fichiers.length > 12 && <li className="flex aspect-square items-center justify-center rounded-lg bg-piste text-sm font-semibold">+{fichiers.length - 12}</li>}
        </ul>
      )}
      <label className="flex items-start gap-2.5 text-xs leading-relaxed text-doux">
        <input type="checkbox" checked={accord} onChange={(e) => setAccord(e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-bordeaux" required />
        {t.consentement}
      </label>
      <MessageErreur>{erreur}</MessageErreur>
      <Bouton type="submit" disabled={!accord || fichiers.length === 0 || !!progression} className="min-h-[52px] rounded-[14px] text-[15px]">
        {progression || t.envoyer}
      </Bouton>
    </form>
  );
}

// Miniature d'une photo choisie (l'adresse temporaire est libérée ensuite)
function Apercu({ fichier }: { fichier: File }) {
  const url = useMemo(() => URL.createObjectURL(fichier), [fichier]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  // eslint-disable-next-line @next/next/no-img-element
  return url ? <img src={url} alt="" className="size-full object-cover" /> : null;
}
