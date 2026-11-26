"use client";
import { useState } from "react";
import { Bouton, Carte, TitreCarte } from "@/components/ui";
import { usePersonne } from "@/lib/session";

const CLE_INSTALLEE = Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);

function base64url(octets: Uint8Array) {
  return btoa(String.fromCharCode(...octets)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Fabrique, dans le navigateur, la paire de clés des notifications sur téléphone (VAPID)
async function fabriquer() {
  const paire = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const publique = new Uint8Array(await crypto.subtle.exportKey("raw", paire.publicKey));
  const privee = (await crypto.subtle.exportKey("jwk", paire.privateKey)).d ?? "";
  return { publique: base64url(publique), privee };
}

// Réglages : installation des notifications sur téléphone (à faire une seule fois)
export function ClesNotifications() {
  const { personne } = usePersonne();
  const [cles, setCles] = useState<{ publique: string; privee: string } | null>(null);

  if (CLE_INSTALLEE)
    return (
      <Carte className="text-sm">
        <TitreCarte>Notifications sur téléphone</TitreCarte>
        <p className="mt-1 text-vert">✓ Les clés sont installées sur le site.</p>
      </Carte>
    );

  const valeurs = cles
    ? [
        ["NEXT_PUBLIC_VAPID_PUBLIC_KEY", cles.publique],
        ["VAPID_PRIVATE_KEY", cles.privee],
        ["VAPID_CONTACT", `mailto:${personne?.email ?? ""}`],
      ]
    : [];

  return (
    <Carte className="flex flex-col gap-3 text-sm">
      <TitreCarte>Notifications sur téléphone</TitreCarte>
      <p className="text-doux">À faire une seule fois : fabriquez les clés ici, puis ajoutez-les dans Vercel (Settings → Environment Variables) et relancez le site (Deployments → Redeploy).</p>
      {!cles ? (
        <Bouton onClick={async () => setCles(await fabriquer())} className="self-start">Fabriquer les clés</Bouton>
      ) : (
        <>
          {valeurs.map(([nom, valeur]) => <Valeur key={nom} nom={nom} valeur={valeur} />)}
          <p className="text-xs text-doux">Ces clés disparaissent si vous quittez la page : ajoutez-les dans Vercel avant. Ne les envoyez à personne.</p>
        </>
      )}
    </Carte>
  );
}

function Valeur({ nom, valeur }: { nom: string; valeur: string }) {
  const [copie, setCopie] = useState(false);
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-fond p-3">
      <span className="font-mono text-xs font-semibold">{nom}</span>
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 break-all text-xs">{valeur}</code>
        <Bouton variante="contour" className="min-h-9 shrink-0" onClick={() => navigator.clipboard.writeText(valeur).then(() => { setCopie(true); setTimeout(() => setCopie(false), 1500); })}>
          {copie ? "Copié" : "Copier"}
        </Bouton>
      </div>
    </div>
  );
}
