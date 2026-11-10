import "server-only";
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_CLE_PUBLIQUE, SUPABASE_URL } from "@/lib/supabase/config";

// Clés lues dans les réglages privés de l'hébergeur (jamais dans le code)
const CLE_PUBLIQUE = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const CLE_PRIVEE = process.env.VAPID_PRIVATE_KEY ?? "";
export const SECRET_ALERTES = process.env.ALERTES_SECRET ?? "";

export function alertesConfigurees() {
  return Boolean(CLE_PUBLIQUE && CLE_PRIVEE && SECRET_ALERTES);
}

let pret = false;
function preparer() {
  if (!pret) {
    webpush.setVapidDetails("mailto:laura.weddings.events@gmail.com", CLE_PUBLIQUE, CLE_PRIVEE);
    pret = true;
  }
}

export function supabaseServeurAnonyme() {
  return createClient(SUPABASE_URL, SUPABASE_CLE_PUBLIQUE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type Notification = { titre: string; texte: string; url: string; etiquette: string };

// Envoie une notification ; renvoie « expire » si le téléphone n'est plus abonné
export async function envoyer(
  abonnement: { endpoint: string; p256dh: string; auth: string },
  n: Notification,
): Promise<"ok" | "expire" | "erreur"> {
  preparer();
  try {
    await webpush.sendNotification(
      { endpoint: abonnement.endpoint, keys: { p256dh: abonnement.p256dh, auth: abonnement.auth } },
      JSON.stringify(n),
      { TTL: 30 * 60, urgency: "high", topic: n.etiquette.slice(0, 32).replace(/[^A-Za-z0-9_-]/g, "") },
    );
    return "ok";
  } catch (e) {
    const code = (e as { statusCode?: number }).statusCode;
    return code === 404 || code === 410 ? "expire" : "erreur";
  }
}

export function heureLocale(instant: string, fuseau: string) {
  return new Intl.DateTimeFormat("fr-FR", { timeZone: fuseau, hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .format(new Date(instant))
    .replace(":", "h");
}

type LigneAnnonce = {
  annonce_id: string;
  texte: string;
  auteur: string | null;
  endpoint: string;
  p256dh: string;
  auth: string;
  jeton: string;
};

// Envoie les notifications des annonces pas encore parties (une précise, ou toutes)
export async function envoyerAnnonces(id: string | null) {
  const supabase = supabaseServeurAnonyme();
  const { data, error } = await supabase.rpc("prendre_annonces", { p_secret: SECRET_ALERTES, p_id: id });
  if (error) return { erreur: error.message, envoyees: 0 };
  const lignes = (data ?? []) as LigneAnnonce[];
  const resultats = await Promise.all(
    lignes.map(async (l) => {
      const statut = await envoyer(l, {
        titre: `📣 ${l.texte}`,
        texte: l.auteur ? `Annonce de ${l.auteur}` : "Annonce de l'organisation",
        url: `/j/${l.jeton}`,
        etiquette: `annonce-${l.annonce_id}`,
      });
      if (statut === "expire") {
        await supabase.rpc("oublier_abonnement", { p_secret: SECRET_ALERTES, p_endpoint: l.endpoint });
      }
      return statut;
    }),
  );
  return { envoyees: resultats.filter((r) => r === "ok").length };
}
