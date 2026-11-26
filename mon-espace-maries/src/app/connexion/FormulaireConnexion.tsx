"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bouton, Carte, Champ, Icones, MessageErreur, Surtitre } from "@/components/ui";
import { supabaseNavigateur } from "@/lib/supabase/navigateur";
import { useSession } from "@/lib/useSession";
import { messageErreur } from "@/lib/erreurs";
import { adresseConfirmation, lireSuite } from "@/lib/suite";
import { dico } from "@/lib/i18n";
import type { Langue } from "@/lib/calculs";

// Connexion sans mot de passe : un lien (ou un code) reçu par e-mail
export function FormulaireConnexion() {
  const router = useRouter();
  const session = useSession();
  const [langue, setLangue] = useState<Langue>("fr");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [envoye, setEnvoye] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState("");
  const t = dico(langue).connexion;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // Langue et adresse pré-remplies depuis l'e-mail d'invitation
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (params.get("lang") === "en" || navigator.language.startsWith("en")) setLangue("en");
    if (params.get("email")) setEmail(params.get("email") ?? "");
  }, []);

  useEffect(() => {
    if (session) router.replace(lireSuite());
  }, [session, router]);

  async function agir(action: () => Promise<void>) {
    setErreur("");
    setEnCours(true);
    try {
      await action();
    } catch (e) {
      setErreur(messageErreur(e as Error, langue));
    } finally {
      setEnCours(false);
    }
  }

  const envoyerLien = () =>
    agir(async () => {
      const supabase = supabaseNavigateur();
      const adresse = email.trim();
      const { data: connue, error: e1 } = await supabase.rpc("adresse_connue", { p_email: adresse });
      if (e1) throw e1;
      if (!connue) return setErreur(t.inconnue);
      const { error } = await supabase.auth.signInWithOtp({
        email: adresse,
        options: { emailRedirectTo: adresseConfirmation(lireSuite()), shouldCreateUser: true },
      });
      if (error) throw error;
      setEnvoye(true);
    });

  const verifierCode = () =>
    agir(async () => {
      const { error } = await supabaseNavigateur().auth.verifyOtp({ email: email.trim(), token: code.replace(/\s/g, ""), type: "email" });
      if (error) throw error;
      router.replace(lireSuite());
    });

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex justify-end gap-1.5">
        {(["fr", "en"] as const).map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setLangue(l)}
            aria-pressed={langue === l}
            className={`min-h-9 min-w-11 rounded-full border text-[13px] font-semibold ${
              langue === l ? "border-bordeaux bg-bordeaux text-fond" : "border-champ bg-carte text-encre"
            }`}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="mt-6 flex flex-col items-center gap-1.5 text-center lg:mt-12">
        <Surtitre className="tracking-[0.14em]">Laura Weddings &amp; Events</Surtitre>
        <h1 className="font-titre text-[40px] font-semibold leading-tight lg:text-5xl">{t.titre}</h1>
        <p className="max-w-[320px] text-sm leading-relaxed text-doux">{t.intro}</p>
      </div>

      {!envoye ? (
        <Carte className="flex flex-col gap-3 rounded-[18px] p-5">
          <form onSubmit={(e) => { e.preventDefault(); envoyerLien(); }} className="flex flex-col gap-3">
            <Champ id="email" libelle={t.email} type="email" inputMode="email" autoComplete="email" placeholder="camille@exemple.fr"
              value={email} onChange={(e) => setEmail(e.target.value)} required className="text-[13px]" />
            <MessageErreur>{erreur}</MessageErreur>
            <Bouton type="submit" disabled={enCours} className="min-h-[52px] rounded-[14px] text-[15px]">{t.bouton}</Bouton>
            <p className="text-center text-xs text-doux">{t.sansMotDePasse}</p>
          </form>
        </Carte>
      ) : (
        <Carte className="flex flex-col items-center gap-3 rounded-[18px] p-6 text-center">
          <span className="text-bordeaux">{Icones.enveloppe()}</span>
          <h2 className="font-titre text-[26px] font-semibold text-bordeaux">{t.verifiezTitre}</h2>
          <p className="text-sm leading-relaxed">{t.verifiez(email)}</p>
          <form onSubmit={(e) => { e.preventDefault(); verifierCode(); }} className="mt-2 flex w-full flex-col gap-3">
            <Champ id="code" libelle={t.code} inputMode="numeric" autoComplete="one-time-code" placeholder="123456"
              value={code} onChange={(e) => setCode(e.target.value)} className="text-center [&_input]:text-center [&_input]:text-xl [&_input]:tracking-[0.3em]" />
            <MessageErreur>{erreur}</MessageErreur>
            <Bouton type="submit" disabled={enCours || code.replace(/\s/g, "").length < 6}>{t.validerCode}</Bouton>
          </form>
          <Bouton variante="contour" onClick={() => { setEnvoye(false); setCode(""); setErreur(""); }}>{t.renvoyer}</Bouton>
        </Carte>
      )}

      <p className="mt-auto text-center text-[11px] leading-relaxed text-doux">
        {t.rgpd} <Link href={`/confidentialite${langue === "en" ? "?lang=en" : ""}`} className="text-bordeaux underline">{t.politique}</Link>
      </p>
    </div>
  );
}
