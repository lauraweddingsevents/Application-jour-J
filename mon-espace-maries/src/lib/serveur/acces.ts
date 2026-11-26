import "server-only";
import { supabaseServeur } from "@/lib/supabase/serveur";
import { supabaseAdmin } from "./config";

export type Connecte = { id: string; role: "admin" | "marie"; couple_id: string | null };

// La personne connectée (d'après le cookie de session), ou null
export async function personneConnectee(): Promise<Connecte | null> {
  const supabase = await supabaseServeur();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const { data: p } = await supabaseAdmin().from("personnes").select("id, role, couple_id").eq("user_id", data.user.id).maybeSingle();
  return (p as Connecte | null) ?? null;
}

export async function estAdminConnecte() {
  return (await personneConnectee())?.role === "admin";
}

export function peutVoirCouple(p: Connecte | null, coupleId: string) {
  return !!p && (p.role === "admin" || p.couple_id === coupleId);
}

export const refus = (message = "Accès refusé", statut = 403) => Response.json({ erreur: message }, { status: statut });

export const estUuid = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
