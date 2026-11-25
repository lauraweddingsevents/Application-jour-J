"use client";
import { useEffect, useState } from "react";
import { Bouton } from "@/components/ui/Bouton";
import { supabaseNavigateur } from "@/lib/supabase/navigateur";
import { messageErreur } from "@/lib/erreurs";

const CLE_PUBLIQUE = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

type Etat = "verification" | "indisponible" | "iphone-a-installer" | "refuse" | "inactif" | "actif";

function cleEnOctets(base64: string) {
  const b = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(b), (c) => c.charCodeAt(0));
}

// Activer / désactiver les notifications push sur ce téléphone
export function ActiverPush() {
  const [etat, setEtat] = useState<Etat>("verification");
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    async function verifier() {
      const ua = navigator.userAgent;
      const ios = /iPhone|iPad|iPod/.test(ua) || (ua.includes("Mac") && "ontouchend" in document);
      const installee = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
      if (!CLE_PUBLIQUE || !("serviceWorker" in navigator)) return setEtat("indisponible");
      if (!("PushManager" in window)) return setEtat(ios && !installee ? "iphone-a-installer" : "indisponible");
      if (Notification.permission === "denied") return setEtat("refuse");
      const reg = await navigator.serviceWorker.getRegistration();
      const abo = await reg?.pushManager.getSubscription();
      setEtat(abo ? "actif" : "inactif");
    }
    verifier().catch(() => setEtat("indisponible"));
  }, []);

  async function activer() {
    setErreur("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return setEtat(permission === "denied" ? "refuse" : "inactif");
      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;
      const abo = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: cleEnOctets(CLE_PUBLIQUE) });
      const json = abo.toJSON();
      const { error } = await supabaseNavigateur().rpc("enregistrer_push", {
        p_endpoint: abo.endpoint,
        p_p256dh: json.keys?.p256dh,
        p_auth: json.keys?.auth,
      });
      if (error) throw error;
      setEtat("actif");
    } catch (e) {
      setErreur(messageErreur(e as Error) || "Activation impossible sur ce téléphone.");
    }
  }

  async function desactiver() {
    const reg = await navigator.serviceWorker.getRegistration();
    const abo = await reg?.pushManager.getSubscription();
    if (abo) {
      await supabaseNavigateur().rpc("supprimer_push", { p_endpoint: abo.endpoint });
      await abo.unsubscribe();
    }
    setEtat("inactif");
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-creme-fonce/60 p-4">
      <p className="font-medium">📲 Notifications sur ce téléphone</p>
      {etat === "verification" && <p className="text-sm text-encre-doux">Vérification…</p>}
      {etat === "indisponible" && <p className="text-sm text-encre-doux">Non disponibles sur cet appareil ou ce navigateur. Vous recevez les e-mails.</p>}
      {etat === "iphone-a-installer" && (
        <p className="text-sm text-encre-doux">
          Sur iPhone, ajoutez d&apos;abord l&apos;application à l&apos;écran d&apos;accueil (Safari → Partager → « Sur l&apos;écran
          d&apos;accueil »), puis ouvrez-la depuis son icône et revenez ici.
        </p>
      )}
      {etat === "refuse" && (
        <p className="text-sm text-encre-doux">Les notifications ont été refusées. Autorisez-les dans les réglages du téléphone pour ce site.</p>
      )}
      {etat === "inactif" && <Bouton variante="secondaire" onClick={activer}>Activer sur ce téléphone</Bouton>}
      {etat === "actif" && (
        <>
          <p className="text-sm text-succes">✓ Activées sur ce téléphone</p>
          <button type="button" onClick={desactiver} className="min-h-[40px] self-start text-sm text-encre-doux underline underline-offset-4">
            Désactiver sur ce téléphone
          </button>
        </>
      )}
      {erreur && <p className="text-sm text-alerte">{erreur}</p>}
    </div>
  );
}
