"use client";
import { useEffect, useRef, useState } from "react";
import { supabaseAnonyme } from "@/lib/supabase/anonyme";
import type { MomentVue } from "@/lib/vue";

export const CLE_PUBLIQUE_ALERTES = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
export const DELAIS = [5, 10, 15, 20, 30, 45, 60];

const cleDelai = (jeton: string) => `macoordo:delai:${jeton}`;
const cleDejaFaites = (jeton: string) => `macoordo:alertes-faites:${jeton}`;

export function lireDelai(jeton: string, parDefaut: number) {
  try {
    const v = Number(localStorage.getItem(cleDelai(jeton)));
    return v > 0 ? v : parDefaut;
  } catch {
    return parDefaut;
  }
}
export function ecrireDelai(jeton: string, delai: number) {
  try {
    localStorage.setItem(cleDelai(jeton), String(delai));
  } catch {}
}

export type Possibilite = "oui" | "iphone-a-installer" | "non";

export function possibiliteNotifications(): Possibilite {
  if (typeof window === "undefined") return "non";
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (ua.includes("Mac") && "ontouchend" in document);
  const installee =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (ios && !installee) return "iphone-a-installer";
  if (!CLE_PUBLIQUE_ALERTES || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window))
    return "non";
  return "oui";
}

function versOctets(base64: string) {
  const complement = "=".repeat((4 - (base64.length % 4)) % 4);
  const brut = atob((base64 + complement).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(brut, (c) => c.charCodeAt(0));
}

async function abonnementActuel() {
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

export async function estAbonne() {
  try {
    return Boolean(await abonnementActuel());
  } catch {
    return false;
  }
}

// Active les notifications sur ce téléphone pour ce lien
export async function activerAlertes(jeton: string, delai: number) {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("refus");
  const reg = await navigator.serviceWorker.ready;
  const abonnement =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: versOctets(CLE_PUBLIQUE_ALERTES) }));
  const json = abonnement.toJSON();
  const { data, error } = await supabaseAnonyme().rpc("enregistrer_abonnement", {
    p_jeton: jeton,
    p_endpoint: abonnement.endpoint,
    p_p256dh: json.keys?.p256dh ?? "",
    p_auth: json.keys?.auth ?? "",
    p_delai: delai,
  });
  if (error || !data) throw error ?? new Error("lien invalide");
}

export async function desactiverAlertes(jeton: string) {
  const abonnement = await abonnementActuel();
  if (!abonnement) return;
  await supabaseAnonyme().rpc("supprimer_abonnement", { p_jeton: jeton, p_endpoint: abonnement.endpoint });
  await abonnement.unsubscribe();
}

export async function envoyerTest(jeton: string) {
  const abonnement = await abonnementActuel();
  if (!abonnement) throw new Error("non abonné");
  const r = await fetch("/api/alertes/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jeton, endpoint: abonnement.endpoint }),
  });
  if (!r.ok) throw new Error("échec");
}

// ---------------------------------------------------------------------
// Alertes dans la page : quand le lien est ouvert, le téléphone vibre et
// un bandeau s'affiche quelques minutes avant chaque moment.
// ---------------------------------------------------------------------
export function useAlertesDansLaPage(
  jeton: string,
  miens: MomentVue[],
  delai: number,
  maintenant: number,
) {
  const [alerte, setAlerte] = useState<MomentVue | null>(null);
  const dejaFaites = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!dejaFaites.current) {
      try {
        dejaFaites.current = new Set(JSON.parse(localStorage.getItem(cleDejaFaites(jeton)) ?? "[]"));
      } catch {
        dejaFaites.current = new Set();
      }
    }
    const faites = dejaFaites.current;
    const due = miens.find((m) => {
      const debut = new Date(m.debut).getTime();
      const cle = `${m.id}@${m.debut}`;
      return debut - delai * 60_000 <= maintenant && maintenant < debut && !faites.has(cle);
    });
    if (!due) return;
    faites.add(`${due.id}@${due.debut}`);
    try {
      localStorage.setItem(cleDejaFaites(jeton), JSON.stringify([...faites].slice(-200)));
    } catch {}
    // Alerte visible et vibrante, au moment où elle devient due
    setAlerte(due);
    navigator.vibrate?.([300, 150, 300, 150, 300]);
  }, [jeton, miens, delai, maintenant]);

  return { alerte, fermer: () => setAlerte(null) };
}
