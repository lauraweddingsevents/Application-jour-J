"use client";
import { useState } from "react";
import { Bouton, Carte, Champ, Chargement, EnTetePage, MessageErreur, MessageSucces, TitreCarte } from "@/components/ui";
import { ActiverPush } from "@/components/ActiverPush";
import { exiger, useDonnees } from "@/lib/espace";
import { supabaseNavigateur } from "@/lib/supabase/navigateur";
import { messageErreur } from "@/lib/erreurs";
import { dico } from "@/lib/i18n";
import type { Reglages as R } from "@/lib/types";

export default function Reglages() {
  const { donnees, erreur } = useDonnees(
    () => exiger(supabaseNavigateur().from("reglages").select("lien_avis_google, lien_avis_mariagesnet").eq("id", 1).single()) as Promise<R>,
    [],
  );
  return (
    <>
      <EnTetePage titre="Réglages" />
      <MessageErreur>{erreur}</MessageErreur>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 xl:items-start">
        {donnees ? <LiensAvis initial={donnees} /> : !erreur && <Chargement />}
        <div className="flex flex-col gap-4">
          <ActiverPush t={dico("fr").notifications} />
          <Carte className="flex flex-col gap-1.5 text-sm">
            <TitreCarte>Alertes reçues</TitreCarte>
            <p className="text-doux">Dans l&apos;appli, par e-mail et sur téléphone : virement déclaré, devis ou contrat déposé, questionnaire terminé par les deux, rendez-vous ajouté par un couple.</p>
          </Carte>
        </div>
      </div>
    </>
  );
}

function LiensAvis({ initial }: { initial: R }) {
  const [v, setV] = useState(initial);
  const [message, setMessage] = useState("");
  const [erreur, setErreur] = useState("");
  const valide = (u: string) => !u || /^https:\/\/\S+$/.test(u);
  return (
    <Carte>
      <form className="flex flex-col gap-3" onSubmit={async (e) => {
        e.preventDefault();
        setMessage("");
        if (!valide(v.lien_avis_google) || !valide(v.lien_avis_mariagesnet)) return setErreur("Les liens doivent commencer par https://");
        const { error } = await supabaseNavigateur().from("reglages").update({ lien_avis_google: v.lien_avis_google.trim(), lien_avis_mariagesnet: v.lien_avis_mariagesnet.trim() }).eq("id", 1);
        if (error) return setErreur(messageErreur(error));
        setErreur("");
        setMessage("Enregistré. Les boutons d'avis apparaîtront chez les mariés à l'ouverture de leur album.");
      }}>
        <TitreCarte>Liens de demande d&apos;avis</TitreCarte>
        <p className="text-xs leading-relaxed text-doux">Proposés aux mariés le lendemain du mariage, à l&apos;ouverture de l&apos;album.</p>
        <Champ id="avis-mn" libelle="Mariages.net" type="url" value={v.lien_avis_mariagesnet} onChange={(e) => setV({ ...v, lien_avis_mariagesnet: e.target.value })}
          placeholder="https://www.mariages.net/…" aide="Espace entreprise Mariages.net → Avis → lien de demande d'avis." />
        <Champ id="avis-g" libelle="Google" type="url" value={v.lien_avis_google} onChange={(e) => setV({ ...v, lien_avis_google: e.target.value })}
          placeholder="https://g.page/r/…/review" aide="Fiche d'établissement Google → « Demander des avis » → copier le lien." />
        <MessageErreur>{erreur}</MessageErreur>
        <MessageSucces>{message}</MessageSucces>
        <Bouton type="submit" className="self-start">Enregistrer</Bouton>
      </form>
    </Carte>
  );
}
