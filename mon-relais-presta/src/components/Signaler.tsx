"use client";
import { useState } from "react";
import { Bouton } from "@/components/ui/Bouton";
import { Carte } from "@/components/ui/Carte";
import { ZoneTexte } from "@/components/ui/ZoneTexte";
import { supabaseNavigateur } from "@/lib/supabase/navigateur";
import { messageErreur } from "@/lib/erreurs";

// « Signaler un abus » : sur chaque demande et chaque profil
export function Signaler({ cible, id }: { cible: "demande" | "membre"; id: string }) {
  const [ouvert, setOuvert] = useState(false);
  const [motif, setMotif] = useState("");
  const [etat, setEtat] = useState<"saisie" | "envoi" | "envoye">("saisie");
  const [erreur, setErreur] = useState("");

  if (etat === "envoye")
    return <p className="text-center text-sm text-encre-doux">Merci, votre signalement a été transmis à l&apos;administration.</p>;
  if (!ouvert)
    return (
      <button type="button" onClick={() => setOuvert(true)} className="min-h-[44px] self-center text-sm text-encre-doux underline underline-offset-4">
        Signaler un abus
      </button>
    );
  return (
    <Carte className="flex flex-col gap-3">
      <h2 className="font-medium">Signaler un abus</h2>
      <p className="text-sm text-encre-doux">
        Votre signalement est confidentiel : seule l&apos;administration le voit.
      </p>
      <ZoneTexte id="motif" libelle="Que se passe-t-il ?" maxLength={1500} value={motif} onChange={(e) => setMotif(e.target.value)} />
      {erreur && <p className="text-sm text-alerte">{erreur}</p>}
      <Bouton
        disabled={motif.trim().length < 5 || etat === "envoi"}
        onClick={async () => {
          setEtat("envoi");
          const { error } = await supabaseNavigateur().rpc("signaler", { p_cible: cible, p_id: id, p_motif: motif });
          if (error) {
            setErreur(messageErreur(error));
            return setEtat("saisie");
          }
          fetch("/api/notifier", { method: "POST" }).catch(() => {});
          setEtat("envoye");
        }}
      >
        Envoyer le signalement
      </Bouton>
      <Bouton variante="discret" onClick={() => setOuvert(false)}>Annuler</Bouton>
    </Carte>
  );
}
