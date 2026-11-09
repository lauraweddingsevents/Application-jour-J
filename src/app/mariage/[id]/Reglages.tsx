"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bouton } from "@/components/ui/Bouton";
import { Carte } from "@/components/ui/Carte";
import { FormulaireMariage } from "@/components/mariage/FormulaireMariage";
import { decalerJoursMoments, modifierMariage, supprimerMariage } from "@/lib/donnees";
import { messageErreur } from "@/lib/erreurs";
import { nomMariage, type Mariage } from "@/lib/types";

export function Reglages({
  mariage,
  onModifie,
}: {
  mariage: Mariage;
  onModifie: (m: Mariage) => void;
}) {
  const router = useRouter();
  const [enregistre, setEnregistre] = useState(false);
  const [confirmer, setConfirmer] = useState(false);
  const [erreur, setErreur] = useState("");

  return (
    <div className="flex flex-col gap-6">
      <Carte>
        <h2 className="mb-4 font-medium">Informations du mariage</h2>
        <FormulaireMariage
          key={mariage.id}
          texteBouton="Enregistrer les modifications"
          aideDate="Si vous changez la date, tout le déroulé est déplacé au nouveau jour, aux mêmes horaires."
          initial={{
            nom_marie_1: mariage.nom_marie_1,
            nom_marie_2: mariage.nom_marie_2,
            date_mariage: mariage.date_mariage,
            lieu_principal: mariage.lieu_principal,
            delai_alerte_defaut: mariage.delai_alerte_defaut,
          }}
          onEnregistrer={async (saisie) => {
            const ecartJours = Math.round(
              (Date.parse(saisie.date_mariage) - Date.parse(mariage.date_mariage)) / 86_400_000,
            );
            const maj = await modifierMariage(mariage.id, saisie);
            // Nouvelle date : tout le déroulé suit, aux mêmes horaires
            await decalerJoursMoments(mariage.id, ecartJours, mariage.fuseau_horaire);
            onModifie(maj);
            setEnregistre(true);
            setTimeout(() => setEnregistre(false), 3000);
          }}
        />
        {enregistre && (
          <p className="mt-3 text-center text-sm text-succes" role="status">
            ✓ Modifications enregistrées
          </p>
        )}
      </Carte>

      <Carte className="ring-alerte/30">
        <h2 className="font-medium">Supprimer ce mariage</h2>
        <p className="mt-1 text-sm text-encre-doux">
          Le déroulé, les intervenants et la fiche pratique seront supprimés
          définitivement. Les liens envoyés ne fonctionneront plus.
        </p>
        {!confirmer ? (
          <Bouton variante="secondaire" className="mt-4 w-full" onClick={() => setConfirmer(true)}>
            Supprimer ce mariage…
          </Bouton>
        ) : (
          <div className="mt-4 flex flex-col gap-2">
            <Bouton
              variante="danger"
              onClick={async () => {
                try {
                  await supprimerMariage(mariage.id);
                  router.replace("/tableau");
                } catch (e) {
                  setErreur(messageErreur(e as Error));
                }
              }}
            >
              Oui, supprimer « {nomMariage(mariage)} »
            </Bouton>
            <Bouton variante="discret" onClick={() => setConfirmer(false)}>
              Annuler
            </Bouton>
          </div>
        )}
        {erreur && <p className="mt-3 text-sm text-alerte">{erreur}</p>}
      </Carte>
    </div>
  );
}
