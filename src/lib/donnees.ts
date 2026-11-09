"use client";
// Lecture et enregistrement des données de la créatrice.
// La sécurité est assurée par la base : chacune ne voit que ses mariages.
import { supabaseNavigateur } from "@/lib/supabase/navigateur";
import type { Intervenant, Mariage } from "@/lib/types";

const CHAMPS_MARIAGE =
  "id, nom_marie_1, nom_marie_2, date_mariage, lieu_principal, fuseau_horaire, delai_alerte_defaut, canal";
const CHAMPS_INTERVENANT =
  "id, mariage_id, nom, role, categorie, telephone, email, jeton, acces_coordination, ordre";

function verifier<T>(res: { data: T | null; error: unknown }): T {
  if (res.error) throw res.error;
  return res.data as T;
}

// ---------- Mariages ----------
export async function listerMariages(): Promise<Mariage[]> {
  return verifier(
    await supabaseNavigateur()
      .from("mariages")
      .select(CHAMPS_MARIAGE)
      .order("date_mariage", { ascending: true }),
  );
}

export async function lireMariage(id: string): Promise<Mariage | null> {
  return verifier(
    await supabaseNavigateur()
      .from("mariages")
      .select(CHAMPS_MARIAGE)
      .eq("id", id)
      .maybeSingle(),
  );
}

export type MariageSaisi = Pick<
  Mariage,
  "nom_marie_1" | "nom_marie_2" | "date_mariage" | "lieu_principal" | "delai_alerte_defaut"
>;

export async function creerMariage(m: MariageSaisi): Promise<Mariage> {
  return verifier(
    await supabaseNavigateur().from("mariages").insert(m).select(CHAMPS_MARIAGE).single(),
  );
}

export async function modifierMariage(id: string, m: MariageSaisi): Promise<Mariage> {
  return verifier(
    await supabaseNavigateur()
      .from("mariages")
      .update(m)
      .eq("id", id)
      .select(CHAMPS_MARIAGE)
      .single(),
  );
}

export async function supprimerMariage(id: string) {
  verifier(await supabaseNavigateur().from("mariages").delete().eq("id", id));
}

// ---------- Intervenants ----------
export async function listerIntervenants(mariageId: string): Promise<Intervenant[]> {
  return verifier(
    await supabaseNavigateur()
      .from("intervenants")
      .select(CHAMPS_INTERVENANT)
      .eq("mariage_id", mariageId)
      .order("ordre")
      .order("nom"),
  );
}

export type IntervenantSaisi = Pick<
  Intervenant,
  "nom" | "role" | "categorie" | "telephone" | "email" | "acces_coordination"
>;

export async function creerIntervenant(
  mariageId: string,
  i: IntervenantSaisi,
  ordre: number,
): Promise<Intervenant> {
  return verifier(
    await supabaseNavigateur()
      .from("intervenants")
      .insert({ ...i, mariage_id: mariageId, ordre })
      .select(CHAMPS_INTERVENANT)
      .single(),
  );
}

export async function modifierIntervenant(id: string, i: IntervenantSaisi): Promise<Intervenant> {
  return verifier(
    await supabaseNavigateur()
      .from("intervenants")
      .update(i)
      .eq("id", id)
      .select(CHAMPS_INTERVENANT)
      .single(),
  );
}

export async function supprimerIntervenant(id: string) {
  verifier(await supabaseNavigateur().from("intervenants").delete().eq("id", id));
}
