import { LIMITES, supabaseAdmin } from "@/lib/serveur/config";
import { coupleDuJeton, estMediaAccepte, extension } from "@/lib/serveur/invites";
import { refus } from "@/lib/serveur/acces";

type Fichier = { nom: string; type: string; taille: number };

// Page invités : prépare un lien d'envoi signé par fichier (le fichier part directement
// du téléphone vers le stockage, sans passer par le serveur de l'appli).
export async function POST(requete: Request, { params }: RouteContext<"/api/invites/[jeton]/televerser">) {
  const { jeton } = await params;
  const couple = await coupleDuJeton(jeton);
  if (!couple) return refus("QR code inconnu", 404);

  const corps = await requete.json().catch(() => null);
  if (!corps || corps.consentement !== true) return refus("Consentement obligatoire", 400);
  const fichiers = (Array.isArray(corps.fichiers) ? corps.fichiers : []) as Fichier[];
  if (fichiers.length === 0 || fichiers.length > LIMITES.parEnvoi) return refus("Nombre de fichiers invalide", 400);
  for (const f of fichiers) {
    if (typeof f?.nom !== "string" || typeof f.type !== "string" || typeof f.taille !== "number" || f.taille <= 0) return refus("Fichier invalide", 400);
    if (!estMediaAccepte(f.type)) return refus("Photos et vidéos uniquement", 400);
    if (f.taille > (f.type.startsWith("video/") ? LIMITES.video : LIMITES.photo)) return refus("Fichier trop lourd", 413);
  }

  const admin = supabaseAdmin();
  const { data: tailles } = await admin.from("medias").select("taille").eq("couple_id", couple.id);
  const deja = (tailles ?? []).reduce((s, m) => s + Number(m.taille), 0);
  if (deja + fichiers.reduce((s, f) => s + f.taille, 0) > LIMITES.parMariage) return refus("L'album de ce mariage est complet.", 413);

  const liens = [];
  for (const f of fichiers) {
    const chemin = `${couple.id}/${Date.now()}-${crypto.randomUUID().slice(0, 12)}.${extension(f.nom, f.type)}`;
    const { data, error } = await admin.storage.from("album").createSignedUploadUrl(chemin);
    if (error || !data) return refus("Envoi impossible pour le moment", 503);
    liens.push({ chemin: data.path, jeton: data.token });
  }
  return Response.json({ liens });
}
