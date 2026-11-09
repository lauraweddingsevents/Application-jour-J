"use client";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_CLE_PUBLIQUE, SUPABASE_URL } from "./config";

// Connexion sans compte, pour les personnes qui ouvrent un lien personnel
let client: SupabaseClient | null = null;
export function supabaseAnonyme() {
  client ??= createClient(SUPABASE_URL, SUPABASE_CLE_PUBLIQUE, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return client;
}
