"use client";
import Link from "next/link";
import { useEffect } from "react";
import { Chargement, EnTetePage, MessageErreur, Vide } from "@/components/ui";
import { exiger, useDonnees } from "@/lib/espace";
import { supabaseNavigateur } from "@/lib/supabase/navigateur";
import { formatDateHeure } from "@/lib/calculs";
import { texteNotificationAdmin } from "@/lib/textesNotifications";
import type { Notification } from "@/lib/types";

export default function AlertesAdmin() {
  const { donnees, erreur } = useDonnees(async () => {
    const sb = supabaseNavigateur();
    const [notifs, couples] = await Promise.all([
      exiger(sb.from("notifications").select("*").eq("pour_admin", true).order("cree_le", { ascending: false }).limit(100)),
      exiger(sb.from("couples").select("id, prenom_1, prenom_2")),
    ]);
    const noms = new Map((couples as { id: string; prenom_1: string; prenom_2: string }[]).map((c) => [c.id, `${c.prenom_1} & ${c.prenom_2}`]));
    return (notifs as Notification[]).map((n) => ({ ...n, noms: noms.get(n.couple_id ?? "") ?? "" }));
  }, []);

  useEffect(() => {
    if (donnees?.some((n) => !n.lu_le)) supabaseNavigateur().rpc("marquer_notifications_lues").then(() => {});
  }, [donnees]);

  return (
    <>
      <EnTetePage titre="Alertes" intro="Les dernières actions de vos couples." />
      <MessageErreur>{erreur}</MessageErreur>
      {!donnees ? (!erreur && <Chargement />) : donnees.length === 0 ? <Vide>Aucune alerte pour le moment.</Vide> : (
        <ul className="flex max-w-3xl flex-col gap-2">
          {donnees.map((n) => {
            const { titre, texte } = texteNotificationAdmin(n, n.noms);
            return (
              <li key={n.id}>
                <Link href={n.lien || "/admin"} className={`flex flex-col gap-0.5 rounded-2xl border px-4 py-3 ${n.lu_le ? "border-trait bg-carte" : "border-tangerine bg-orange-pale/50"}`}>
                  <span className="text-[15px] font-semibold">{titre}</span>
                  {texte && <span className="text-sm">{texte}</span>}
                  <span className="text-xs text-doux">{formatDateHeure(n.cree_le)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
