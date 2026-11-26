import "server-only";
import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CONFIG } from "./config";

export type Push = { titre: string; texte: string; url: string };

let pret = false;
export function pushConfigure() {
  return Boolean(CONFIG.vapid.publique && CONFIG.vapid.privee);
}

// Envoie la notification aux téléphones des personnes ; oublie ceux qui ne sont plus abonnés
export async function envoyerPush(admin: SupabaseClient, personnes: string[], n: Push) {
  if (!pushConfigure() || personnes.length === 0) return;
  if (!pret) {
    webpush.setVapidDetails(CONFIG.vapid.contact, CONFIG.vapid.publique, CONFIG.vapid.privee);
    pret = true;
  }
  const { data } = await admin.from("abonnements_push").select("endpoint, p256dh, auth").in("personne_id", personnes);
  await Promise.all(
    (data ?? []).map(async (a) => {
      try {
        await webpush.sendNotification({ endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } }, JSON.stringify({ ...n, url: CONFIG.site + n.url }), { TTL: 24 * 3600 });
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) await admin.from("abonnements_push").delete().eq("endpoint", a.endpoint);
      }
    }),
  );
}
