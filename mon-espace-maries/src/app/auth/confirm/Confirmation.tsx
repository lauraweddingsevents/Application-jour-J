"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { EmailOtpType } from "@supabase/supabase-js";
import { BoutonLien } from "@/components/ui";
import { supabaseNavigateur } from "@/lib/supabase/navigateur";
import { messageErreur } from "@/lib/erreurs";
import { suiteSure } from "@/lib/suite";

export function Confirmation() {
  const router = useRouter();
  const params = useSearchParams();
  const [erreur, setErreur] = useState("");
  const dejaFait = useRef(false);

  useEffect(() => {
    if (dejaFait.current) return;
    dejaFait.current = true;
    const supabase = supabaseNavigateur();
    const suiteBrute = params.get("suite");
    const dansSuite = suiteBrute?.match(/[?&]token_hash=([^&#]+)/)?.[1];
    const tokenHash = params.get("token_hash") ?? (dansSuite ? decodeURIComponent(dansSuite) : null);
    const type = (params.get("type") ?? "email") as EmailOtpType;
    const code = params.get("code");
    const erreurLien = params.get("error_description");
    const suite = suiteSure(suiteBrute?.split(/[?&]token_hash=/)[0], "/");

    async function confirmer() {
      if (erreurLien) return setErreur(messageErreur({ message: erreurLien }));
      const { data } = await supabase.auth.getSession();
      if (data.session) return router.replace(suite);
      // Lien universel : fonctionne même si l'e-mail est ouvert sur un autre appareil
      if (tokenHash) {
        const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
        if (error) return setErreur(messageErreur(error));
        return router.replace(suite);
      }
      if (code) {
        return setErreur("Ce lien doit être ouvert sur l'appareil où vous l'avez demandé. Demandez un nouveau lien depuis cet appareil, ou saisissez le code reçu.");
      }
      setErreur("Ce lien de connexion est incomplet.");
    }
    confirmer();
  }, [params, router]);

  if (!erreur) return <p className="mt-8 text-doux">Connexion en cours…</p>;
  return (
    <div className="mt-8 flex flex-col items-center gap-6">
      <p className="text-rouge">{erreur}</p>
      <BoutonLien href="/connexion">Recevoir un nouveau lien</BoutonLien>
    </div>
  );
}
