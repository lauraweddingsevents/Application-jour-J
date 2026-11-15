"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseNavigateur } from "@/lib/supabase/navigateur";
import { effacerMemoire } from "@/lib/memoire";
import { BandeauHorsLigne } from "@/components/BandeauHorsLigne";
import { LogoPlan } from "./LogoPlan";

export function EnTetePlan({ retour, deconnexion = false }: { retour?: { href: string; texte: string }; deconnexion?: boolean }) {
  const router = useRouter();
  async function seDeconnecter() {
    await supabaseNavigateur().auth.signOut();
    effacerMemoire();
    router.replace("/plan-de-salle");
  }
  return (
    <>
      <BandeauHorsLigne />
      <header className="flex min-h-[52px] items-center justify-between gap-2">
        {retour ? (
          <Link href={retour.href} className="flex min-h-[44px] items-center gap-1 text-or-fonce">
            <span aria-hidden>←</span> {retour.texte}
          </Link>
        ) : (
          <Link href="/plans">
            <LogoPlan />
          </Link>
        )}
        {deconnexion ? (
          <button type="button" onClick={seDeconnecter} className="min-h-[44px] px-2 text-sm text-encre-doux underline-offset-4 hover:underline">
            Se déconnecter
          </button>
        ) : (
          <Link href="/compte?depuis=plans" className="min-h-[44px] px-2 pt-3 text-sm text-encre-doux underline-offset-4 hover:underline">
            Mon compte
          </Link>
        )}
      </header>
    </>
  );
}
