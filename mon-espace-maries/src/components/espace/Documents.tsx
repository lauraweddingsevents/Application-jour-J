"use client";
import { useState } from "react";
import { Bouton, Carte, Champ, Chargement, EnTetePage, MessageErreur, Pastille, Selecteur, Vide, ZoneTexte, type Ton } from "@/components/ui";
import { exiger, useDonnees, useEspace } from "@/lib/espace";
import { supabaseNavigateur } from "@/lib/supabase/navigateur";
import { formatDate } from "@/lib/calculs";
import { messageErreur } from "@/lib/erreurs";
import { notifierServeur } from "@/lib/notifier";
import type { DocumentCouple, StatutDocument } from "@/lib/types";

const TAILLE_MAX = 20 * 1024 * 1024;
export const TON_DOCUMENT: Record<StatutDocument, Ton> = { partage: "bordeaux", signe: "vert", a_valider: "orange", en_relecture: "orange", relu: "vert" };

export function chargerDocuments(coupleId: string) {
  return exiger(supabaseNavigateur().from("documents").select("*").eq("couple_id", coupleId).order("cree_le", { ascending: false })) as Promise<DocumentCouple[]>;
}

// Nom de fichier sans accents ni caractères spéciaux (pour le stockage)
export function nomFichierSur(nom: string) {
  const propre = nom.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").slice(-80);
  return `${crypto.randomUUID().slice(0, 8)}-${propre || "fichier"}`;
}

export async function ouvrirDocument(chemin: string) {
  // Fenêtre ouverte tout de suite (sinon bloquée sur iPhone), puis adresse temporaire de 2 minutes
  const fenetre = window.open("", "_blank");
  const { data, error } = await supabaseNavigateur().storage.from("documents").createSignedUrl(chemin, 120);
  if (error || !data) {
    fenetre?.close();
    throw error ?? new Error("lien");
  }
  if (fenetre) fenetre.location.href = data.signedUrl;
  else window.location.href = data.signedUrl;
}

export function Documents() {
  const { couple, droits, t, langue } = useEspace();
  const { donnees, erreur, recharger } = useDonnees(() => chargerDocuments(couple.id), [couple.id]);
  const [erreurAction, setErreurAction] = useState("");
  const td = t.documents;
  const coordination = couple.formule !== "complete";

  async function agir(action: () => PromiseLike<{ error: { message: string; code?: string } | null }>) {
    setErreurAction("");
    const { error } = await action();
    if (error) setErreurAction(messageErreur(error, langue));
    else notifierServeur();
    await recharger();
  }

  async function supprimer(d: DocumentCouple) {
    if (!confirm(t.confirmerSuppression)) return;
    await supabaseNavigateur().storage.from("documents").remove([d.chemin]);
    await agir(() => supabaseNavigateur().from("documents").delete().eq("id", d.id));
  }

  return (
    <>
      <EnTetePage titre={td.titre} intro={coordination ? td.introCoordination : td.introComplete} />
      <MessageErreur>{erreur || erreurAction}</MessageErreur>
      {droits.editer && <Depot onFini={recharger} onErreur={setErreurAction} admin={droits.admin} />}
      {!donnees ? (!erreur && <Chargement texte={t.chargement} />) : donnees.length === 0 ? <Vide>{td.vide}</Vide> : (
        <div className="grid gap-3 lg:grid-cols-2">
          {donnees.map((d) => (
            <Carte key={d.id} className="flex flex-col gap-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="break-words text-[15px] font-semibold">{d.nom}</span>
                  <span className="text-xs text-doux">
                    {td.deposeLe(formatDate(d.cree_le, langue))}
                    {droits.admin && ` · ${d.depose_par === "couple" ? "par les mariés" : "par vous"}`}
                  </span>
                </div>
                <Pastille ton={TON_DOCUMENT[d.statut]}>{td.statuts[d.statut]}</Pastille>
              </div>
              {d.commentaire && (
                <p className="rounded-xl bg-fond px-3 py-2 text-sm leading-relaxed">
                  <span className="block text-xs font-semibold text-bordeaux">{td.commentaireLaura}</span>
                  {d.commentaire}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <Bouton variante="contour" onClick={() => ouvrirDocument(d.chemin).catch((e) => setErreurAction(messageErreur(e, langue)))}>{td.ouvrir}</Bouton>
                {(droits.admin || (d.depose_par === "couple" && d.statut === "en_relecture")) && (
                  <Bouton variante="danger" onClick={() => supprimer(d)}>{t.supprimer}</Bouton>
                )}
              </div>
              {droits.admin && <ReglageAdmin d={d} agir={agir} />}
            </Carte>
          ))}
        </div>
      )}
    </>
  );
}

function Depot({ onFini, onErreur, admin }: { onFini: () => void; onErreur: (m: string) => void; admin: boolean }) {
  const { couple, t, langue } = useEspace();
  const td = t.documents;
  const [fichier, setFichier] = useState<File | null>(null);
  const [nom, setNom] = useState("");
  const [statut, setStatut] = useState<StatutDocument>("partage");
  const [enCours, setEnCours] = useState(false);
  const [cle, setCle] = useState(0);

  async function envoyer() {
    if (!fichier) return;
    if (fichier.size > TAILLE_MAX) return onErreur(td.tropLourd);
    setEnCours(true);
    onErreur("");
    try {
      const supabase = supabaseNavigateur();
      const chemin = `${couple.id}/${nomFichierSur(fichier.name)}`;
      const { error: e1 } = await supabase.storage.from("documents").upload(chemin, fichier, { contentType: fichier.type || undefined });
      if (e1) throw e1;
      const { error: e2 } = await supabase.from("documents").insert({
        couple_id: couple.id, nom: (nom.trim() || fichier.name).slice(0, 200), chemin, type_mime: fichier.type, taille: fichier.size, statut,
      });
      if (e2) {
        await supabase.storage.from("documents").remove([chemin]);
        throw e2;
      }
      notifierServeur();
      setFichier(null);
      setNom("");
      setCle((c) => c + 1);
      onFini();
    } catch (e) {
      onErreur(messageErreur(e as Error, langue));
    } finally {
      setEnCours(false);
    }
  }

  return (
    <Carte className="mb-4">
      <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); envoyer(); }}>
        <p className="font-titre text-xl font-semibold">{td.deposer}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs text-doux">
            {td.fichier}
            <input key={cle} type="file" accept="application/pdf,image/*" required onChange={(e) => setFichier(e.target.files?.[0] ?? null)}
              className="min-h-11 rounded-[10px] border border-champ bg-white px-2 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-bordeaux-pale file:px-3 file:py-1.5 file:text-bordeaux" />
            <span>{td.deposerAide}</span>
          </label>
          <Champ id="doc-nom" libelle={td.nom} value={nom} onChange={(e) => setNom(e.target.value)} placeholder={fichier?.name ?? ""} maxLength={200} />
        </div>
        {admin && (
          <Selecteur id="doc-statut" libelle="Statut" value={statut} onChange={(e) => setStatut(e.target.value as StatutDocument)}
            options={[{ valeur: "partage", texte: "Partagé" }, { valeur: "a_valider", texte: "À valider" }, { valeur: "signe", texte: "Signé" }]} className="sm:w-60" />
        )}
        <Bouton type="submit" disabled={!fichier || enCours} className="sm:self-start">{enCours ? td.envoi : td.deposer}</Bouton>
      </form>
    </Carte>
  );
}

// Laura : statut et commentaire (« Relu » prévient les mariés)
function ReglageAdmin({ d, agir }: { d: DocumentCouple; agir: (a: () => PromiseLike<{ error: { message: string; code?: string } | null }>) => Promise<void> }) {
  const [commentaire, setCommentaire] = useState(d.commentaire);
  const [statut, setStatut] = useState<StatutDocument>(d.statut);
  const options = d.depose_par === "couple"
    ? [{ valeur: "en_relecture", texte: "En relecture" }, { valeur: "relu", texte: "Relu" }]
    : [{ valeur: "partage", texte: "Partagé" }, { valeur: "a_valider", texte: "À valider" }, { valeur: "signe", texte: "Signé" }];
  const modifie = commentaire !== d.commentaire || statut !== d.statut;
  return (
    <div className="mt-1 flex flex-col gap-2 border-t border-trait-fin pt-3">
      <ZoneTexte id={`com-${d.id}`} libelle="Commentaire visible des mariés" value={commentaire} onChange={(e) => setCommentaire(e.target.value)} maxLength={2000} className="[&_textarea]:min-h-16" />
      <div className="flex flex-wrap items-end gap-2">
        <Selecteur id={`st-${d.id}`} libelle="Statut" value={statut} onChange={(e) => setStatut(e.target.value as StatutDocument)} options={options} className="w-44" />
        {d.depose_par === "couple" && d.statut !== "relu" && (
          <Bouton onClick={() => agir(() => supabaseNavigateur().from("documents").update({ statut: "relu", commentaire: commentaire.trim() }).eq("id", d.id))}>Marquer « Relu »</Bouton>
        )}
        {modifie && (
          <Bouton variante="contour" onClick={() => agir(() => supabaseNavigateur().from("documents").update({ statut, commentaire: commentaire.trim() }).eq("id", d.id))}>Enregistrer</Bouton>
        )}
      </div>
    </div>
  );
}
