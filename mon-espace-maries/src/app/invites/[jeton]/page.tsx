import type { Metadata } from "next";
import { coupleDuJeton } from "@/lib/serveur/invites";
import { formatDate } from "@/lib/calculs";
import { dico } from "@/lib/i18n";
import { DepotInvite } from "./DepotInvite";

export const metadata: Metadata = { title: "Photos du mariage", robots: { index: false, follow: false } };

// Page ouverte en scannant le QR code des tables : sans compte
export default async function PageInvites({ params }: PageProps<"/invites/[jeton]">) {
  const { jeton } = await params;
  const couple = await coupleDuJeton(jeton).catch(() => null);
  const t = dico(couple?.langue);
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-5 pb-7 pt-8">
      {couple ? (
        <>
          <div className="flex flex-col items-center gap-1 pt-2 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-bordeaux">{t.invites.mariageDe}</p>
            <h1 className="font-titre text-[38px] font-semibold leading-tight">{couple.prenom_1} &amp; {couple.prenom_2}</h1>
            <p className="text-[13px] text-doux">{formatDate(couple.date_mariage, couple.langue)}</p>
          </div>
          <DepotInvite jeton={jeton} langue={couple.langue} noms={`${couple.prenom_1} & ${couple.prenom_2}`} />
        </>
      ) : (
        <p className="py-20 text-center text-doux">{t.invites.introuvable}</p>
      )}
      <p className="mt-auto text-center text-[11px] tracking-[0.06em] text-doux">
        {t.invites.proposePar} · <a href={`/confidentialite${couple?.langue === "en" ? "?lang=en" : ""}`} className="underline">{t.connexion.politique}</a>
      </p>
    </main>
  );
}
