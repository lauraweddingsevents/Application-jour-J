"use client";
import { useState } from "react";
import { Bouton } from "@/components/ui/Bouton";
import { Carte } from "@/components/ui/Carte";
import { EnTete } from "@/components/EnTete";
import { Protege } from "@/components/Protege";
import { CLE_PUBLIQUE_ALERTES } from "@/lib/alertes";

type Cles = { publique: string; privee: string; secret: string };

function base64url(octets: Uint8Array) {
  return btoa(String.fromCharCode(...octets)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function depuisBase64url(t: string) {
  const b = atob(t.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (t.length % 4)) % 4));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
}

// Les clés sont fabriquées ICI, dans le navigateur de la créatrice :
// elles ne passent par aucun serveur.
async function fabriquerCles(): Promise<Cles> {
  const paire = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const jwk = await crypto.subtle.exportKey("jwk", paire.privateKey);
  const x = depuisBase64url(jwk.x!);
  const y = depuisBase64url(jwk.y!);
  const publique = new Uint8Array(65);
  publique[0] = 4;
  publique.set(x, 1);
  publique.set(y, 33);
  const secret = base64url(crypto.getRandomValues(new Uint8Array(32)));
  return { publique: base64url(publique), privee: jwk.d!, secret };
}

export function ConfigurationAlertes() {
  return (
    <Protege>
      <Contenu />
    </Protege>
  );
}

function Contenu() {
  const [cles, setCles] = useState<Cles | null>(null);
  const deja = Boolean(CLE_PUBLIQUE_ALERTES);
  const adresse = typeof window !== "undefined" ? `${window.location.origin}/api/alertes` : "";

  const sql = cles
    ? `insert into public.reglages_prives (cle, valeur) values
  ('secret_alertes', '${cles.secret}'),
  ('adresse_alertes', '${adresse}')
on conflict (cle) do update set valeur = excluded.valeur;`
    : "";

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-6">
      <EnTete retour={{ href: "/tableau", texte: "Mes mariages" }} />
      <h1 className="mt-6 text-2xl font-medium">Configurer les alertes</h1>
      <p className="mt-2 text-encre-doux">
        À faire <strong>une seule fois</strong>. Cette page fabrique, dans votre
        navigateur, les clés qui permettent d&apos;envoyer les notifications.
      </p>

      <Carte className="mt-6">
        <p className="font-medium">État actuel</p>
        <p className="mt-1 text-sm">
          {deja
            ? "✅ Les clés sont installées sur le site : les alertes sont prêtes."
            : "⏳ Les clés ne sont pas encore installées sur le site."}
        </p>
        {deja && (
          <p className="mt-2 text-sm text-alerte">
            Attention : fabriquer de nouvelles clés désactiverait les alertes de
            tous les téléphones déjà abonnés.
          </p>
        )}
      </Carte>

      {!cles ? (
        <Bouton className="mt-6 w-full" variante={deja ? "secondaire" : "principal"} onClick={async () => setCles(await fabriquerCles())}>
          Fabriquer les clés
        </Bouton>
      ) : (
        <div className="mt-6 flex flex-col gap-5">
          <Carte>
            <p className="font-medium">1. Dans Vercel</p>
            <p className="mt-1 text-sm text-encre-doux">
              Settings → Environment Variables : ajoutez ces 3 réglages (nom à
              gauche, valeur à droite).
            </p>
            <Valeur nom="NEXT_PUBLIC_VAPID_PUBLIC_KEY" valeur={cles.publique} />
            <Valeur nom="VAPID_PRIVATE_KEY" valeur={cles.privee} secret />
            <Valeur nom="ALERTES_SECRET" valeur={cles.secret} secret />
          </Carte>
          <Carte>
            <p className="font-medium">2. Dans Supabase</p>
            <p className="mt-1 text-sm text-encre-doux">
              SQL Editor → New query : collez ce texte puis cliquez sur Run.
            </p>
            <Valeur nom="Texte SQL" valeur={sql} secret />
          </Carte>
          <p className="text-sm text-encre-doux">
            🔒 Ces valeurs ne sont enregistrées nulle part ailleurs : gardez cette
            page ouverte jusqu&apos;à la fin, et ne les envoyez à personne.
          </p>
        </div>
      )}
    </main>
  );
}

function Valeur({ nom, valeur, secret }: { nom: string; valeur: string; secret?: boolean }) {
  const [copie, setCopie] = useState(false);
  return (
    <div className="mt-4">
      <p className="text-xs font-medium text-or-fonce">
        {nom} {secret && "🔒"}
      </p>
      <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-all rounded-xl bg-creme p-3 text-xs">{valeur}</pre>
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(valeur);
          setCopie(true);
          setTimeout(() => setCopie(false), 2000);
        }}
        className="mt-2 min-h-[40px] rounded-full bg-or px-4 text-sm font-medium text-blanc"
      >
        {copie ? "✓ Copié" : "Copier"}
      </button>
    </div>
  );
}
