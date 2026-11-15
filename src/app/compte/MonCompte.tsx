"use client";
import { useEffect, useState } from "react";
import { Bouton } from "@/components/ui/Bouton";
import { Carte } from "@/components/ui/Carte";
import { EnTete } from "@/components/EnTete";
import { Protege } from "@/components/Protege";
import { supabaseNavigateur } from "@/lib/supabase/navigateur";
import { useDroits, type Droits } from "@/lib/droits";
import { dateLongue } from "@/lib/dates";

const jour = (iso?: string | null) => (iso ? dateLongue(iso.slice(0, 10)) : "");

function description(d: Droits): { titre: string; texte: string; action: "paiement" | "portail" | null } {
  switch (d.raison) {
    case "admin":
      return { titre: "Compte administrateur", texte: "Accès complet aux applications.", action: null };
    case "lancement":
      return { titre: "Accès complet", texte: "L'abonnement n'est pas encore en place : profitez de toutes les fonctions.", action: null };
    case "essai":
      return { titre: "Essai gratuit", texte: `Jusqu'au ${jour(d.fin_essai)}. Ensuite : ${d.prix_affiche ?? "abonnement mensuel"}.`, action: "paiement" };
    case "abonne":
      return {
        titre: d.abonnement_statut === "annule" ? "Abonnement résilié" : "Abonnement actif",
        texte:
          d.abonnement_statut === "annule"
            ? `Accès jusqu'au ${jour(d.abonnement_fin)}.`
            : d.abonnement_statut === "en_retard"
              ? "Le dernier paiement n'est pas passé : mettez à jour votre carte."
              : d.abonnement_fin
                ? `Prochain renouvellement le ${jour(d.abonnement_fin)}.`
                : "Merci pour votre confiance !",
        action: "portail",
      };
    case "expire":
      return {
        titre: "Essai terminé",
        texte: `Vos mariages restent consultables. Abonnez-vous (${d.prix_affiche ?? "abonnement mensuel"}) pour en créer de nouveaux.`,
        action: "paiement",
      };
    case "suspendu":
      return { titre: "Compte suspendu", texte: "Vos mariages restent consultables. Contactez Laura Weddings & Events pour réactiver votre compte.", action: null };
    default:
      return { titre: "Accès complet", texte: "", action: null };
  }
}

export function MonCompte() {
  return (
    <Protege>
      <Contenu />
    </Protege>
  );
}

function Contenu() {
  const droits = useDroits();
  const [email, setEmail] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    supabaseNavigateur()
      .auth.getSession()
      .then(({ data }) => setEmail(data.session?.user.email ?? ""));
  }, []);

  async function aller(route: "paiement" | "portail") {
    setEnCours(true);
    setMessage("");
    try {
      const { data } = await supabaseNavigateur().auth.getSession();
      const r = await fetch(`/api/abonnement/${route}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${data.session?.access_token ?? ""}` },
      });
      const json = (await r.json().catch(() => ({}))) as { url?: string; erreur?: string };
      if (json.url) window.location.href = json.url;
      else setMessage(json.erreur ?? "Le paiement n'est pas disponible pour le moment.");
    } catch {
      setMessage("Impossible de joindre le serveur. Vérifiez votre connexion.");
    } finally {
      setEnCours(false);
    }
  }

  const d = droits ? description(droits) : null;
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-6">
      <EnTete retour={{ href: "/tableau", texte: "Mes mariages" }} />
      <h1 className="mt-8 text-2xl font-medium">Mon compte</h1>
      {email && <p className="mt-1 text-encre-doux">Connectée avec {email}</p>}

      {droits === undefined && <p className="mt-8 text-encre-doux">Chargement…</p>}
      {d && droits && (
        <Carte className="mt-6">
          <h2 className="font-medium">{d.titre}</h2>
          {d.texte && <p className="mt-1 text-sm text-encre-doux">{d.texte}</p>}
          {d.action && droits.paiement_actif && (
            <Bouton className="mt-4 w-full" disabled={enCours} onClick={() => aller(d.action!)}>
              {enCours ? "Un instant…" : d.action === "paiement" ? "S'abonner" : "Gérer mon abonnement"}
            </Bouton>
          )}
          {message && <p className="mt-3 text-sm text-alerte">{message}</p>}
        </Carte>
      )}
      {droits === null && (
        <Carte className="mt-6">
          <h2 className="font-medium">Accès complet</h2>
        </Carte>
      )}
      <p className="mt-6 text-sm text-encre-doux">
        Ce compte donne aussi accès à <strong>Ma Visite Technique</strong>, l&apos;outil des visites techniques de lieux.
      </p>
    </main>
  );
}
