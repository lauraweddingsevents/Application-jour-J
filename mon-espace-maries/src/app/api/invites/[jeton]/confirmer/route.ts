import { supabaseAdmin } from "@/lib/serveur/config";
import { coupleDuJeton, estMediaAccepte } from "@/lib/serveur/invites";
import { refus } from "@/lib/serveur/acces";

type Envoye = { chemin: string; type: string; taille: number };

// Page invités : enregistre dans l'album les fichiers bien arrivés dans le stockage
export async function POST(requete: Request, { params }: RouteContext<"/api/invites/[jeton]/confirmer">) {
  const { jeton } = await params;
  const couple = await coupleDuJeton(jeton);
  if (!couple) return refus("QR code inconnu", 404);
  const corps = await requete.json().catch(() => null);
  const prenom = typeof corps?.prenom === "string" ? corps.prenom.trim().slice(0, 80) : "";
  const envoyes = (Array.isArray(corps?.fichiers) ? corps.fichiers : []).slice(0, 50) as Envoye[];

  const admin = supabaseAdmin();
  const lignes = [];
  for (const f of envoyes) {
    if (typeof f?.chemin !== "string" || !f.chemin.startsWith(`${couple.id}/`) || f.chemin.includes("..") || !estMediaAccepte(String(f.type))) continue;
    const { data: existe } = await admin.storage.from("album").exists(f.chemin);
    if (!existe) continue;
    lignes.push({ couple_id: couple.id, chemin: f.chemin, type_mime: String(f.type).slice(0, 100), taille: Math.max(0, Number(f.taille) || 0), invite_prenom: prenom });
  }
  if (lignes.length) {
    const { error } = await admin.from("medias").upsert(lignes, { onConflict: "chemin", ignoreDuplicates: true });
    if (error) return refus("Enregistrement impossible", 500);
  }
  return Response.json({ enregistres: lignes.length });
}
