"use client";
import { useState } from "react";
import Link from "next/link";
import { Bouton } from "@/components/ui/Bouton";
import { Carte } from "@/components/ui/Carte";
import { Champ } from "@/components/ui/Champ";
import { messageErreur } from "@/lib/erreurs";
import { useDroits } from "@/lib/droits";
import { supabaseNavigateur } from "@/lib/supabase/navigateur";

// Suppression définitive du compte (RGPD), avec confirmation écrite
export function SuppressionCompte() {
  const droits = useDroits();
  const [ouvert, setOuvert] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState("");
  const [supprime, setSupprime] = useState(false);
  // Un abonnement payant en cours doit d'abord être résilié
  const abonnementEnCours = droits?.raison === "abonne" && droits.abonnement_statut !== "annule";

  async function supprimer() {
    setEnCours(true);
    setErreur("");
    try {
      const sb = supabaseNavigateur();
      const { error } = await sb.rpc("supprimer_mon_compte");
      if (error) throw error;
      await sb.auth.signOut().catch(() => {});
      try {
        localStorage.clear();
      } catch {
        // rien à effacer
      }
      setSupprime(true);
    } catch (e) {
      setErreur(`${messageErreur(e as Error)} — vous pouvez aussi nous écrire pour demander la suppression.`);
      setEnCours(false);
    }
  }

  if (supprime)
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-creme px-6 text-center" role="status">
        <p className="text-4xl" aria-hidden>👋</p>
        <p className="text-xl font-medium">Votre compte a été supprimé.</p>
        <p className="text-encre-doux">Toutes vos données ont été effacées. Merci d&apos;avoir utilisé nos outils.</p>
        <Link href="/" className="text-or-fonce underline underline-offset-4">Retour à l&apos;accueil</Link>
      </div>
    );

  return (
    <Carte className="mt-4 flex flex-col gap-3">
      <h2 className="font-medium">Supprimer mon compte</h2>
      {!ouvert ? (
        <>
          <p className="text-sm text-encre-doux">Efface définitivement votre compte et tout ce que vous avez créé.</p>
          <Bouton variante="discret" onClick={() => setOuvert(true)}>
            Supprimer mon compte…
          </Bouton>
        </>
      ) : abonnementEnCours ? (
        <p className="text-sm">
          Votre abonnement est en cours : résiliez-le d&apos;abord (plus haut sur cette page), puis revenez ici.
        </p>
      ) : (
        <>
          <p className="text-sm">
            Seront effacés <strong>définitivement</strong> : votre compte, vos plans de salle (y compris pour les personnes
            avec qui vous les partagez), vos mariages, leurs déroulés et les liens de leurs intervenants.
          </p>
          <p className="text-sm text-encre-doux">Pensez à imprimer ou exporter ce que vous voulez garder.</p>
          <Champ
            id="confirmerSuppression"
            libelle="Pour confirmer, écrivez SUPPRIMER"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            autoComplete="off"
          />
          {erreur && <p className="text-sm text-alerte">{erreur}</p>}
          <Bouton variante="danger" disabled={enCours || confirmation.trim().toUpperCase() !== "SUPPRIMER"} onClick={supprimer}>
            {enCours ? "Suppression…" : "Supprimer définitivement"}
          </Bouton>
          <Bouton variante="secondaire" onClick={() => setOuvert(false)}>
            Annuler
          </Bouton>
        </>
      )}
    </Carte>
  );
}
