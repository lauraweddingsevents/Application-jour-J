"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { EmailOtpType } from "@supabase/supabase-js";
import { BoutonLien } from "@/components/ui/Bouton";
import { supabaseNavigateur } from "@/lib/supabase/navigateur";
import { messageErreur } from "@/lib/erreurs";

export function Confirmation() {
  const router = useRouter();
  const params = useSearchParams();
  const [erreur, setErreur] = useState("");
  const dejaFait = useRef(false);

  useEffect(() => {
    if (dejaFait.current) return;
    dejaFait.current = true;

    const supabase = supabaseNavigateur();
    const tokenHash = params.get("token_hash");
    const type = (params.get("type") ?? "email") as EmailOtpType;
    const code = params.get("code");
    const erreurLien = params.get("error_description");

    async function confirmer() {
      if (erreurLien) return setErreur(messageErreur({ message: erreurLien }));
      // Lien « universel » : fonctionne même si l'e-mail est ouvert sur un autre appareil
      if (tokenHash) {
        const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
        if (error) return setErreur(messageErreur(error));
      } else if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) return setErreur(messageErreur(error));
      } else {
        return setErreur("Ce lien de connexion est incomplet.");
      }
      router.replace("/tableau");
    }
    confirmer();
  }, [params, router]);

  if (!erreur) return <p className="mt-8 text-encre-doux">Connexion en cours…</p>;

  return (
    <div className="mt-8 flex flex-col items-center gap-6">
      <p className="text-alerte">{erreur}</p>
      <BoutonLien href="/connexion">Recevoir un nouveau lien</BoutonLien>
    </div>
  );
}
