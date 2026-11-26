import { estUuid, peutVoirCouple, personneConnectee, refus } from "@/lib/serveur/acces";
import { CONFIG, supabaseAdmin } from "@/lib/serveur/config";
import { convertirDeroule, jetonMaCoordo } from "@/lib/deroule";

// Déroulé du jour J, lu en direct dans Ma Coordo à partir du lien « Les mariés » de la fiche couple.
// Le lien et son code ne sont jamais envoyés au navigateur des mariés.
export async function GET(requete: Request) {
  const couple = new URL(requete.url).searchParams.get("couple");
  if (!estUuid(couple)) return refus("Couple invalide", 400);
  if (!peutVoirCouple(await personneConnectee(), couple)) return refus();

  const { data } = await supabaseAdmin().from("couples_prives").select("lien_ma_coordo").eq("couple_id", couple).maybeSingle();
  const jeton = jetonMaCoordo(data?.lien_ma_coordo ?? "");
  if (!jeton || !CONFIG.maCoordo.url || !CONFIG.maCoordo.cle) return Response.json({ disponible: false, moments: [], jours: [] });

  const r = await fetch(`${CONFIG.maCoordo.url}/rest/v1/rpc/vue_intervenant`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: CONFIG.maCoordo.cle, Authorization: `Bearer ${CONFIG.maCoordo.cle}` },
    body: JSON.stringify({ p_jeton: jeton }),
    cache: "no-store",
  });
  if (!r.ok) {
    console.error("Ma Coordo", r.status, await r.text().catch(() => ""));
    return refus("Ma Coordo indisponible", 502);
  }
  return Response.json(convertirDeroule(await r.json()), { headers: { "Cache-Control": "no-store" } });
}
