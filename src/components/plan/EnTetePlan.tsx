"use client";
import Link from "next/link";
import { BandeauHorsLigne } from "@/components/BandeauHorsLigne";
import { LogoPlan } from "./LogoPlan";

export function EnTetePlan({ retour }: { retour?: { href: string; texte: string } }) {
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
        <Link href="/compte?depuis=plans" className="min-h-[44px] px-2 pt-3 text-sm text-encre-doux underline-offset-4 hover:underline">
          Mon compte
        </Link>
      </header>
    </>
  );
}
