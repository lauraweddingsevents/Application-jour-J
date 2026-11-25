import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Carte } from "@/components/ui/Carte";
import { TexteCharte } from "@/components/TexteCharte";

export const metadata: Metadata = { title: "Charte d'utilisation" };

export default function PageCharte() {
  return (
    <main className="mx-auto w-full max-w-xl px-4 py-10">
      <Link href="/" className="block text-center"><Logo /></Link>
      <h1 className="mt-8 text-2xl font-light">Charte d&apos;utilisation</h1>
      <Carte className="mt-5"><TexteCharte /></Carte>
    </main>
  );
}
