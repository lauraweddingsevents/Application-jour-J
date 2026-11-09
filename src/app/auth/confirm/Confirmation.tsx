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
  const [detail, setDetail] = useState("");
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

      // 1. La bibliothèque Supabase traite déjà toute seule un lien « ?code=… » :
      //    on attend simplement qu'elle ait fini, puis on regarde si on est connecté.
      const { data } = await supabase.auth.getSession();
      if (data.session) return router.replace("/tableau");

      // 2. Lien « universel » (?token_hash=…) : fonctionne même si l'e-mail
      //    est ouvert sur un autre appareil que celui de la demande.
      if (tokenHash) {
        const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
        if (error) return afficher(error);
        return router.replace("/tableau");
      }

      if (code) {
        // Le lien a été ouvert dans un autre navigateur que celui de la demande
        return setErreur(
          "Ce lien doit être ouvert sur le même appareil et dans le même navigateur que celui où vous avez demandé la connexion. Demandez un nouveau lien depuis cet appareil.",
        );
      }
      setErreur("Ce lien de connexion est incomplet.");
    }

    function afficher(error: { message?: string; code?: string }) {
      setErreur(messageErreur(error));
      setDetail(error.code ?? error.message ?? "");
    }

    confirmer();
  }, [params, router]);

  if (!erreur) return <p className="mt-8 text-encre-doux">Connexion en cours…</p>;

  return (
    <div className="mt-8 flex flex-col items-center gap-6">
      <p className="text-alerte">{erreur}</p>
      {detail && <p className="text-xs text-encre-doux">Détail technique : {detail}</p>}
      <BoutonLien href="/connexion">Recevoir un nouveau lien</BoutonLien>
    </div>
  );
}
