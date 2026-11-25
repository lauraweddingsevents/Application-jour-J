"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bouton } from "@/components/ui/Bouton";
import { Carte } from "@/components/ui/Carte";
import { Case } from "@/components/ui/Case";
import { FormulaireMembre } from "@/components/FormulaireMembre";
import { ActiverPush } from "@/components/ActiverPush";
import { useMembre } from "@/lib/membre";
import { supabaseNavigateur } from "@/lib/supabase/navigateur";
import { messageErreur } from "@/lib/erreurs";

export function MonProfil() {
  const router = useRouter();
  const { membre, recharger } = useMembre();
  const [notifEmail, setNotifEmail] = useState(membre?.notif_email ?? true);
  const [notifPush, setNotifPush] = useState(membre?.notif_push ?? true);
  const [enregistre, setEnregistre] = useState(false);
  if (!membre) return null;

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-light">Mon profil</h1>
      <Carte>
        <FormulaireMembre
          initial={membre}
          texteBouton={enregistre ? "Enregistré ✓" : "Enregistrer"}
          enPlus={
            <div className="flex flex-col gap-3">
              <h2 className="text-sm font-medium">Notifications</h2>
              <Case id="notif-email" coche={notifEmail} onChange={(v) => { setNotifEmail(v); setEnregistre(false); }}>
                Recevoir les e-mails (nouvelles demandes pour mes métiers et mes départements, suivi de mes demandes)
              </Case>
              <Case id="notif-push" coche={notifPush} onChange={(v) => { setNotifPush(v); setEnregistre(false); }}>
                Recevoir les notifications sur mon téléphone
              </Case>
              <ActiverPush />
            </div>
          }
          onEnvoyer={async (v) => {
            const { error } = await supabaseNavigateur().rpc("modifier_profil", {
              p_nom: v.nom,
              p_entreprise: v.entreprise,
              p_metiers: v.metiers,
              p_zones: v.zones,
              p_departements: v.departements,
              p_lien: v.lien,
              p_notif_email: notifEmail,
              p_notif_push: notifPush,
            });
            if (error) return messageErreur(error);
            await recharger();
            setEnregistre(true);
          }}
        />
      </Carte>
      <Link href={`/membre/${membre.id}`} className="text-center text-or-fonce underline underline-offset-4">
        Voir ma fiche et mon compteur de réciprocité
      </Link>
      <Link href="/charte" className="text-center text-sm text-encre-doux underline underline-offset-4">
        Charte d&apos;utilisation
      </Link>
      <Bouton
        variante="secondaire"
        onClick={async () => {
          await supabaseNavigateur().auth.signOut();
          router.replace("/");
        }}
      >
        Me déconnecter
      </Bouton>
    </div>
  );
}
