"use client";
import { useState } from "react";
import { Bouton } from "@/components/ui/Bouton";
import { Carte } from "@/components/ui/Carte";
import { TexteCharte } from "@/components/TexteCharte";
import { useMembre } from "@/lib/membre";
import { supabaseNavigateur } from "@/lib/supabase/navigateur";
import { messageErreur } from "@/lib/erreurs";

// La charte a été modifiée depuis la dernière acceptation : on la fait relire
export function AccepterCharte() {
  const { charteVersion, recharger } = useMembre();
  const [coche, setCoche] = useState(false);
  const [erreur, setErreur] = useState("");

  async function accepter() {
    const { error } = await supabaseNavigateur().rpc("accepter_charte", { p_version: charteVersion });
    if (error) return setErreur(messageErreur(error));
    await recharger();
  }

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-8">
      <h1 className="text-xl font-medium">La charte a été mise à jour</h1>
      <p className="mt-1 text-encre-doux">Merci de la relire et de l&apos;accepter pour continuer.</p>
      <Carte className="mt-5"><TexteCharte /></Carte>
      <label className="mt-5 flex items-start gap-3">
        <input type="checkbox" className="mt-1 size-6 accent-or" checked={coche} onChange={(e) => setCoche(e.target.checked)} />
        <span>J&apos;ai lu et j&apos;accepte la charte d&apos;utilisation.</span>
      </label>
      {erreur && <p className="mt-3 text-sm text-alerte">{erreur}</p>}
      <Bouton className="mt-5 w-full" disabled={!coche} onClick={accepter}>Continuer</Bouton>
    </main>
  );
}
