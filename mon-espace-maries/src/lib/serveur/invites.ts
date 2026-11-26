import "server-only";
import { supabaseAdmin } from "./config";

export type CoupleInvite = { id: string; prenom_1: string; prenom_2: string; date_mariage: string; langue: "fr" | "en" };

// Couple correspondant au code du QR code (null si inconnu)
export async function coupleDuJeton(jeton: string): Promise<CoupleInvite | null> {
  if (!/^[A-Za-z0-9]{8,32}$/.test(jeton)) return null;
  const { data } = await supabaseAdmin().from("couples").select("id, prenom_1, prenom_2, date_mariage, langue").eq("jeton_invites", jeton).maybeSingle();
  return (data as CoupleInvite | null) ?? null;
}

export const estMediaAccepte = (type: string) => /^(image|video)\//.test(type);

export function extension(nom: string, type: string) {
  const ext = nom.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5);
  if (ext && ext !== nom.toLowerCase()) return ext;
  return type.split("/")[1]?.replace(/[^a-z0-9]/g, "").slice(0, 5) || "bin";
}
