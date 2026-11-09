"use client";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabaseNavigateur } from "@/lib/supabase/navigateur";

// Indique si la créatrice est connectée (undefined = on vérifie encore)
export function useSession() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    const supabase = supabaseNavigateur();
    let fini = false;
    supabase.auth.getSession().then(({ data }) => {
      fini = true;
      setSession(data.session);
    });
    // Sans réseau, le renouvellement de la connexion peut bloquer : on n'attend pas
    const garde = setTimeout(() => {
      if (!fini && !navigator.onLine) setSession(null);
    }, 2500);
    const { data } = supabase.auth.onAuthStateChange((_evenement, s) =>
      setSession(s),
    );
    return () => {
      clearTimeout(garde);
      data.subscription.unsubscribe();
    };
  }, []);

  return session;
}
