import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_CLE_PUBLIQUE, SUPABASE_URL } from "./supabase/config";

// ---------------------------------------------------------------------
// Abonnement payant (Stripe). Tout est désactivé tant que les clés ne
// sont pas renseignées dans Vercel ET que « paiement_actif » est faux.
// ---------------------------------------------------------------------
const CLE_STRIPE = process.env.STRIPE_SECRET_KEY ?? "";
const SECRET_WEBHOOK = process.env.STRIPE_WEBHOOK_SECRET ?? "";
const PRIX = process.env.STRIPE_PRICE_ID ?? "";
// Clé secrète Supabase (Project Settings > API Keys > Secret key) : seulement côté serveur
const CLE_SECRETE_SUPABASE = process.env.SUPABASE_SECRET_KEY ?? "";

export const stripeConfigure = () => Boolean(CLE_STRIPE && PRIX && CLE_SECRETE_SUPABASE);

/** Appel à l'API Stripe (sans bibliothèque supplémentaire) */
export async function stripe<T = Record<string, unknown>>(chemin: string, parametres: Record<string, string>): Promise<T> {
  const r = await fetch(`https://api.stripe.com/v1/${chemin}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${CLE_STRIPE}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(parametres),
  });
  const json = await r.json();
  if (!r.ok) throw new Error(json?.error?.message ?? "Erreur Stripe");
  return json as T;
}

export async function stripeLire<T = Record<string, unknown>>(chemin: string): Promise<T> {
  const r = await fetch(`https://api.stripe.com/v1/${chemin}`, { headers: { Authorization: `Bearer ${CLE_STRIPE}` } });
  const json = await r.json();
  if (!r.ok) throw new Error(json?.error?.message ?? "Erreur Stripe");
  return json as T;
}

export const PRIX_STRIPE = PRIX;

/** Accès « administrateur » à la base, pour enregistrer l'état des abonnements */
export function supabaseAdmin(): SupabaseClient {
  return createClient(SUPABASE_URL, CLE_SECRETE_SUPABASE, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Retrouve la personne connectée à partir du jeton envoyé par l'application */
export async function utilisateurDeLaRequete(requete: Request) {
  const jeton = requete.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!jeton) return null;
  const sb = createClient(SUPABASE_URL, SUPABASE_CLE_PUBLIQUE, { auth: { persistSession: false } });
  const { data } = await sb.auth.getUser(jeton);
  return data.user ?? null;
}

/** Vérifie que la notification vient bien de Stripe (signature) */
export function signatureValide(corps: string, entete: string | null, secret = SECRET_WEBHOOK, tolerance = 300) {
  if (!entete || !secret) return false;
  const morceaux = Object.fromEntries(
    entete.split(",").map((m) => {
      const i = m.indexOf("=");
      return [m.slice(0, i), m.slice(i + 1)];
    }),
  );
  const t = Number(morceaux.t);
  if (!t || Math.abs(Date.now() / 1000 - t) > tolerance) return false;
  const attendu = createHmac("sha256", secret).update(`${t}.${corps}`).digest("hex");
  const signatures = entete
    .split(",")
    .filter((m) => m.startsWith("v1="))
    .map((m) => m.slice(3));
  return signatures.some((s) => s.length === attendu.length && timingSafeEqual(Buffer.from(s), Buffer.from(attendu)));
}

/** Traduit l'état Stripe en état d'abonnement de l'application */
export function statutDepuisStripe(statut: string, annulationPrevue: boolean): "actif" | "en_retard" | "annule" | "aucun" {
  if (statut === "active" || statut === "trialing") return annulationPrevue ? "annule" : "actif";
  if (statut === "past_due") return "en_retard";
  if (statut === "canceled" || statut === "unpaid" || statut === "incomplete_expired") return "annule";
  return "aucun";
}
