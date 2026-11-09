"use client";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabaseNavigateur } from "@/lib/supabase/navigateur";

// Indique si la créatrice est connectée (undefined = on vérifie encore)
export function useSession() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    const supabase = supabaseNavigateur();
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_evenement, s) =>
      setSession(s),
    );
    return () => data.subscription.unsubscribe();
  }, []);

  return session;
}
