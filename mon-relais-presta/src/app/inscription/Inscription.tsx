"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { Carte } from "@/components/ui/Carte";
import { Case } from "@/components/ui/Case";
import { Chargement } from "@/components/Garde";
import { FormulaireMembre } from "@/components/FormulaireMembre";
import { TexteCharte } from "@/components/TexteCharte";
import { useMembre } from "@/lib/membre";
import { supabaseNavigateur } from "@/lib/supabase/navigateur";
import { messageErreur } from "@/lib/erreurs";

// Première connexion : la fiche du membre et l'acceptation de la charte
export function Inscription() {
  const router = useRouter();
  const { session, membre, recharger } = useMembre();
  const [charte, setCharte] = useState(false);
  const [version, setVersion] = useState<number | null>(null);
  const surVersion = useCallback((v: number) => setVersion(v), []);

  useEffect(() => {
    if (session === null) router.replace("/connexion?suite=/inscription");
    // Déjà inscrit(e) (sauf inscription refusée, qui peut être refaite)
    else if (membre && membre.statut !== "refuse") router.replace(membre.statut === "valide" ? "/demandes" : "/attente");
  }, [session, membre, router]);

  if (!session || membre === undefined || (membre && membre.statut !== "refuse")) return <Chargement />;

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-10">
      <div className="text-center"><Logo /></div>
      <h1 className="mt-8 text-2xl font-light">Rejoindre la communauté</h1>
      <p className="mt-1 text-encre-doux">
        Votre fiche est visible des autres membres. Elle sera validée par l&apos;administration avant votre
        premier accès.
      </p>
      <Carte className="mt-6">
        <FormulaireMembre
          initial={{
            nom: membre?.nom ?? "",
            entreprise: membre?.entreprise ?? "",
            metier_id: membre?.metier_id ?? null,
            zones: membre?.zones ?? [],
            departements: membre?.departements ?? [],
            lien: membre?.lien ?? "",
          }}
          texteBouton="Envoyer mon inscription"
          peutEnvoyer={charte && version !== null}
          enPlus={
            <div className="flex flex-col gap-3">
              <h2 className="text-sm font-medium">Charte d&apos;utilisation</h2>
              <div className="max-h-72 overflow-y-auto rounded-2xl border border-or-clair bg-creme/50 p-4 text-sm">
                <TexteCharte onVersion={surVersion} />
              </div>
              <Case id="charte" coche={charte} onChange={setCharte}>
                J&apos;ai lu la charte et je m&apos;engage à la respecter.
              </Case>
            </div>
          }
          onEnvoyer={async (v) => {
            const { error } = await supabaseNavigateur().rpc("inscription", {
              p_nom: v.nom,
              p_entreprise: v.entreprise,
              p_metier_id: v.metier_id,
              p_zones: v.zones,
              p_departements: v.departements,
              p_lien: v.lien,
              p_charte_version: version,
            });
            if (error) return messageErreur(error);
            await recharger();
            router.replace("/attente");
          }}
        />
      </Carte>
    </main>
  );
}
