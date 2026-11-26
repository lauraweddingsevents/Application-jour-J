import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

// Tous les fichiers d'un dossier de stockage (pages de 1 000)
async function listerFichiers(admin: SupabaseClient, seau: string, dossier: string) {
  const noms: string[] = [];
  for (let page = 0; page < 100; page++) {
    const { data, error } = await admin.storage.from(seau).list(dossier, { limit: 1000, offset: page * 1000 });
    if (error) throw error;
    noms.push(...(data ?? []).filter((f) => f.id).map((f) => `${dossier}/${f.name}`));
    if (!data || data.length < 1000) break;
  }
  return noms;
}

// Suppression complète d'un espace : fichiers, comptes de connexion des mariés, données
export async function supprimerCouple(admin: SupabaseClient, coupleId: string) {
  for (const seau of ["documents", "album"]) {
    const fichiers = await listerFichiers(admin, seau, coupleId);
    for (let i = 0; i < fichiers.length; i += 100) {
      const { error } = await admin.storage.from(seau).remove(fichiers.slice(i, i + 100));
      if (error) throw error;
    }
  }
  const { data: maries } = await admin.from("personnes").select("user_id").eq("couple_id", coupleId);
  const { error } = await admin.from("couples").delete().eq("id", coupleId);
  if (error) throw error;
  for (const m of maries ?? []) {
    if (m.user_id) await admin.auth.admin.deleteUser(m.user_id).catch((e) => console.error("Compte non supprimé", e));
  }
}

// Export de toutes les données d'un couple (fichiers : liens valables 7 jours)
export async function exporterCouple(admin: SupabaseClient, coupleId: string) {
  const lire = async (table: string, colonne = "couple_id") => (await admin.from(table).select("*").eq(colonne, coupleId)).data ?? [];
  const [couple] = await lire("couples", "id");
  const documents = await lire("documents");
  const medias = await lire("medias");
  const signer = async (seau: string, chemins: string[]) => {
    const liens: Record<string, string> = {};
    for (let i = 0; i < chemins.length; i += 100) {
      const { data } = await admin.storage.from(seau).createSignedUrls(chemins.slice(i, i + 100), 7 * 24 * 3600);
      for (const d of data ?? []) if (d.path && d.signedUrl) liens[d.path] = d.signedUrl;
    }
    return liens;
  };
  const liensDocs = await signer("documents", documents.map((d) => d.chemin));
  const liensMedias = await signer("album", medias.map((m) => m.chemin));
  return {
    exporte_le: new Date().toISOString(),
    couple,
    fiche_privee: (await lire("couples_prives"))[0] ?? null,
    personnes: (await lire("personnes")).map((p) => ({ ...p, user_id: undefined })),
    retroplanning: await lire("etapes"),
    budget: await lire("budget_postes"),
    echeancier: await lire("echeances"),
    rendez_vous: await lire("rendez_vous"),
    taches: await lire("taches"),
    prestataires: await lire("prestataires"),
    proches: await lire("proches"),
    questions: await lire("questions"),
    reponses: await lire("reponses"),
    documents: documents.map((d) => ({ ...d, lien_7_jours: liensDocs[d.chemin] ?? null })),
    album: medias.map((m) => ({ ...m, lien_7_jours: liensMedias[m.chemin] ?? null })),
  };
}
