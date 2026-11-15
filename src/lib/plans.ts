"use client";
// Lecture et enregistrement des plans de salle (base Supabase).
// La sécurité est assurée par la base : chacun ne voit que ses plans.
import { supabaseNavigateur } from "@/lib/supabase/navigateur";
import { avecMemoire } from "@/lib/memoire";
import { planExemple, planVide } from "@/plan/exemple";
import { estPlanValide } from "@/plan/moteur";
import { normaliser } from "@/plan/normaliser";
import type { Plan, PlanContenu, TypeCompte } from "@/plan/types";

const CHAMPS = "id, proprietaire_id, nom, contenu, version, archive, updated_at, created_at";

function verifier<T>(res: { data: T | null; error: unknown }): T {
  if (res.error) throw res.error;
  return res.data as T;
}

async function moi() {
  const { data } = await supabaseNavigateur().auth.getSession();
  return data.session?.user.id ?? null;
}

// ---------- Profil ----------
export type Profil = { id: string; nom: string | null; type_compte: TypeCompte | null; formule: string };

export async function lireProfil(): Promise<Profil | null> {
  const id = await moi();
  if (!id) return null;
  return avecMemoire(`profil:${id}`, async () =>
    verifier<Profil | null>(
      await supabaseNavigateur().from("profils").select("id, nom, type_compte, formule").eq("id", id).maybeSingle(),
    ),
  );
}

export async function modifierProfil(champs: { nom?: string | null; type_compte?: TypeCompte }) {
  const id = await moi();
  if (!id) throw new Error("non connecté");
  verifier(await supabaseNavigateur().from("profils").update(champs).eq("id", id));
}

// ---------- Plans ----------
export async function listerPlans(): Promise<Plan[]> {
  const id = await moi();
  return avecMemoire(`plans:${id}`, async () => {
    const plans = verifier<Plan[]>(
      await supabaseNavigateur().from("plans").select(CHAMPS).order("updated_at", { ascending: false }),
    );
    // Mon rôle sur chaque plan (propriétaire, éditeur, lecteur)
    const roles = verifier<{ plan_id: string; role: Plan["role"] }[]>(
      await supabaseNavigateur().from("plans_membres").select("plan_id, role").eq("user_id", id!),
    );
    const parPlan = new Map(roles.map((r) => [r.plan_id, r.role]));
    return plans.map((p) => ({
      ...p,
      contenu: normaliser(p.contenu),
      role: parPlan.get(p.id) ?? (p.proprietaire_id === id ? "proprietaire" : undefined),
    }));
  });
}

export async function lirePlan(planId: string): Promise<Plan | null> {
  const id = await moi();
  return avecMemoire(`plan:${planId}`, async () => {
    const p = verifier<Plan | null>(await supabaseNavigateur().from("plans").select(CHAMPS).eq("id", planId).maybeSingle());
    if (!p) return null;
    const { data } = await supabaseNavigateur().from("plans_membres").select("role").eq("plan_id", planId).eq("user_id", id!).maybeSingle();
    return { ...p, contenu: normaliser(p.contenu), role: (data?.role as Plan["role"]) ?? (p.proprietaire_id === id ? "proprietaire" : undefined) };
  });
}

// Enregistre le contenu seulement si personne ne l'a modifié entre-temps
// (« version » = celle sur laquelle on travaillait). Renvoie la nouvelle version,
// ou null en cas de conflit.
export async function enregistrerContenu(planId: string, contenu: PlanContenu, version: number): Promise<number | null> {
  const res = await supabaseNavigateur()
    .from("plans")
    .update({ contenu })
    .eq("id", planId)
    .eq("version", version)
    .select("version")
    .maybeSingle();
  if (res.error) throw res.error;
  return res.data ? (res.data as { version: number }).version : null;
}

// ---------- Historique des versions ----------
export type VersionPlan = {
  id: string;
  version: number;
  libelle: string | null;
  auteur_nom: string | null;
  automatique: boolean;
  created_at: string;
};

export async function listerVersions(planId: string): Promise<VersionPlan[]> {
  const res = await supabaseNavigateur()
    .from("plans_versions")
    .select("id, version, libelle, auteur_nom, automatique, created_at")
    .eq("plan_id", planId)
    .order("created_at", { ascending: false })
    .limit(80);
  if (res.error) return [];
  return res.data as VersionPlan[];
}

export async function lireVersion(versionId: string): Promise<PlanContenu> {
  const v = verifier<{ contenu: PlanContenu }>(
    await supabaseNavigateur().from("plans_versions").select("contenu").eq("id", versionId).single(),
  );
  return normaliser(v.contenu);
}

export async function nommerVersion(planId: string, version: number, contenu: PlanContenu, libelle: string) {
  const id = await moi();
  const profil = await lireProfil().catch(() => null);
  verifier(
    await supabaseNavigateur().from("plans_versions").insert({
      plan_id: planId, version, contenu, libelle: libelle.trim(), auteur_id: id, auteur_nom: profil?.nom ?? null, automatique: false,
    }),
  );
}

export async function creerPlan(nom: string, depart: "exemple" | "vide" | PlanContenu = "exemple"): Promise<Plan> {
  const contenu = depart === "exemple" ? planExemple(nom) : depart === "vide" ? planVide(nom) : { ...depart, name: nom };
  return verifier<Plan>(
    await supabaseNavigateur().from("plans").insert({ nom: nom.trim(), contenu }).select(CHAMPS).single(),
  );
}

export async function renommerPlan(planId: string, nom: string, contenu: PlanContenu) {
  verifier(
    await supabaseNavigateur()
      .from("plans")
      .update({ nom: nom.trim(), contenu: { ...contenu, name: nom.trim() } })
      .eq("id", planId),
  );
}

export async function dupliquerPlan(plan: Plan): Promise<Plan> {
  return creerPlan(`${plan.nom} (copie)`, plan.contenu);
}

export async function archiverPlan(planId: string, archive: boolean) {
  verifier(await supabaseNavigateur().from("plans").update({ archive }).eq("id", planId));
}

export async function supprimerPlan(planId: string) {
  verifier(await supabaseNavigateur().from("plans").delete().eq("id", planId));
}

// Import d'un plan depuis le « code du plan » de l'ancien outil (prototype)
export async function importerPlan(code: string): Promise<Plan> {
  let contenu: unknown;
  try {
    contenu = JSON.parse(code.trim());
  } catch {
    throw new Error("code-invalide");
  }
  if (!estPlanValide(contenu)) throw new Error("code-invalide");
  return creerPlan(contenu.name || "Plan importé", normaliser(contenu));
}
