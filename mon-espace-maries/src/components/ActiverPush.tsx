"use client";
import { useEffect, useState } from "react";
import { Bouton } from "@/components/ui";
import { supabaseNavigateur } from "@/lib/supabase/navigateur";
import { messageErreur } from "@/lib/erreurs";
import type { Dictionnaire } from "@/lib/i18n";

const CLE_PUBLIQUE = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
type Etat = "verification" | "indisponible" | "iphone" | "refuse" | "inactif" | "actif";

function cleEnOctets(base64: string) {
  const b = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(b), (c) => c.charCodeAt(0));
}

// Activer / désactiver les notifications sur ce téléphone (ou cet ordinateur)
export function ActiverPush({ t }: { t: Dictionnaire["notifications"] }) {
  const [etat, setEtat] = useState<Etat>("verification");
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    async function verifier() {
      const ua = navigator.userAgent;
      const ios = /iPhone|iPad|iPod/.test(ua) || (ua.includes("Mac") && "ontouchend" in document);
      const installee = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
      if (!CLE_PUBLIQUE || !("serviceWorker" in navigator)) return setEtat("indisponible");
      if (!("PushManager" in window)) return setEtat(ios && !installee ? "iphone" : "indisponible");
      if (Notification.permission === "denied") return setEtat("refuse");
      const reg = await navigator.serviceWorker.getRegistration();
      setEtat((await reg?.pushManager.getSubscription()) ? "actif" : "inactif");
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
      const { error } = await supabaseNavigateur().rpc("enregistrer_push", { p_endpoint: abo.endpoint, p_p256dh: json.keys?.p256dh, p_auth: json.keys?.auth });
      if (error) throw error;
      setEtat("actif");
    } catch (e) {
      setErreur(messageErreur(e as Error));
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
    <div className="flex flex-col gap-2 rounded-2xl border border-trait bg-carte p-4">
      <p className="text-sm font-semibold">{t.pushTitre}</p>
      {etat === "indisponible" && <p className="text-sm text-doux">{t.pushIndispo}</p>}
      {etat === "iphone" && <p className="text-sm text-doux">{t.pushIphone}</p>}
      {etat === "refuse" && <p className="text-sm text-doux">{t.pushRefuse}</p>}
      {etat === "inactif" && <Bouton variante="contour" onClick={activer} className="self-start">{t.pushActiver}</Bouton>}
      {etat === "actif" && (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-vert">✓ {t.pushActif}</span>
          <button type="button" onClick={desactiver} className="min-h-9 text-sm text-doux underline underline-offset-4">{t.pushDesactiver}</button>
        </div>
      )}
      {erreur && <p className="text-sm text-rouge">{erreur}</p>}
    </div>
  );
}
