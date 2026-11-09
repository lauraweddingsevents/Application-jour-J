"use client";
import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_CLE_PUBLIQUE, SUPABASE_URL } from "./config";

// Connexion à Supabase depuis le téléphone ou l'ordinateur de l'utilisateur
export function supabaseNavigateur() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_CLE_PUBLIQUE);
}
