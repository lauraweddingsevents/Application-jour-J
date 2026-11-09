"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { supabaseNavigateur } from "@/lib/supabase/navigateur";

export function EnTete({ retour }: { retour?: { href: string; texte: string } }) {
  const router = useRouter();

  async function seDeconnecter() {
    await supabaseNavigateur().auth.signOut();
    router.replace("/");
  }

  return (
    <header className="flex min-h-[52px] items-center justify-between gap-2">
      {retour ? (
        <Link
          href={retour.href}
          className="flex min-h-[44px] items-center gap-1 text-or-fonce"
        >
          <span aria-hidden>←</span> {retour.texte}
        </Link>
      ) : (
        <Link href="/tableau">
          <Logo />
        </Link>
      )}
      <button
        type="button"
        onClick={seDeconnecter}
        className="min-h-[44px] px-2 text-sm text-encre-doux underline-offset-4 hover:underline"
      >
        Se déconnecter
      </button>
    </header>
  );
}
