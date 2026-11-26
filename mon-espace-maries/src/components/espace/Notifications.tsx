"use client";
import Link from "next/link";
import { useEffect } from "react";
import { Chargement, EnTetePage, MessageErreur, Vide } from "@/components/ui";
import { ActiverPush } from "@/components/ActiverPush";
import { exiger, useDonnees, useEspace } from "@/lib/espace";
import { supabaseNavigateur } from "@/lib/supabase/navigateur";
import { formatDateHeure } from "@/lib/calculs";
import { texteNotificationCouple } from "@/lib/textesNotifications";
import { seDeconnecter } from "@/lib/session";
import type { Notification } from "@/lib/types";

// Liste des dernières nouveautés ; chacune mène à la partie concernée
export function Notifications() {
  const { t, langue } = useEspace();
  const { donnees, erreur } = useDonnees(
    () => exiger(supabaseNavigateur().from("notifications").select("*").order("cree_le", { ascending: false }).limit(60)) as Promise<Notification[]>,
    [],
  );

  // Ouvrir la page marque tout comme lu
  useEffect(() => {
    if (donnees?.some((n) => !n.lu_le)) supabaseNavigateur().rpc("marquer_notifications_lues").then(() => {});
  }, [donnees]);

  return (
    <>
      <EnTetePage titre={t.notifications.titre} />
      <MessageErreur>{erreur}</MessageErreur>
      {!donnees ? (!erreur && <Chargement texte={t.chargement} />) : donnees.length === 0 ? <Vide>{t.notifications.vide}</Vide> : (
        <ul className="flex flex-col gap-2">
          {donnees.map((n) => {
            const { titre, texte } = texteNotificationCouple(n, langue);
            return (
              <li key={n.id}>
                <Link href={n.lien || "/espace"} className={`flex flex-col gap-0.5 rounded-2xl border px-4 py-3 ${n.lu_le ? "border-trait bg-carte" : "border-tangerine bg-orange-pale/50"}`}>
                  <span className="flex items-center gap-2 text-[15px] font-semibold">
                    {!n.lu_le && <span aria-hidden className="size-2 rounded-full bg-tangerine" />}
                    {titre}
                  </span>
                  {texte && <span className="text-sm leading-relaxed">{texte}</span>}
                  <span className="text-xs text-doux">{formatDateHeure(n.cree_le, langue)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <div className="mt-6 flex flex-col gap-3">
        <ActiverPush t={t.notifications} />
        <button type="button" onClick={seDeconnecter} className="min-h-11 self-start text-sm text-doux underline underline-offset-4 lg:hidden">{t.nav.deconnexion}</button>
      </div>
    </>
  );
}
