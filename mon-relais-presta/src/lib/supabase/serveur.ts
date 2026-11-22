import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_CLE_PUBLIQUE, SUPABASE_URL } from "./config";

// Connexion à Supabase depuis le serveur, au nom de la personne connectée
export async function supabaseServeur() {
  const magasin = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_CLE_PUBLIQUE, {
    cookies: {
      getAll() {
        return magasin.getAll();
      },
      setAll(aEcrire) {
        try {
          aEcrire.forEach(({ name, value, options }) =>
            magasin.set(name, value, options),
          );
        } catch {
          // Appelé depuis une page : le rafraîchissement de session se fait ailleurs.
        }
      },
    },
  });
}
