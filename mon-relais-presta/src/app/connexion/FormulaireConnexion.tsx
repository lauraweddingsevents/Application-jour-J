"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bouton } from "@/components/ui/Bouton";
import { Carte } from "@/components/ui/Carte";
import { Champ } from "@/components/ui/Champ";
import { supabaseNavigateur } from "@/lib/supabase/navigateur";
import { useSession } from "@/lib/useSession";
import { messageErreur } from "@/lib/erreurs";
import { adresseConfirmation, lireSuite } from "@/lib/suite";

// Connexion par lien magique (ou par le code à 6 chiffres du même e-mail,
// pratique quand l'application est installée sur l'écran d'accueil)
export function FormulaireConnexion() {
  const router = useRouter();
  const session = useSession();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [envoye, setEnvoye] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    if (session) router.replace(lireSuite());
  }, [session, router]);

  async function agir(action: () => Promise<void>) {
    setErreur("");
    setEnCours(true);
    try {
      await action();
    } catch (e) {
      setErreur(messageErreur(e as Error));
    } finally {
      setEnCours(false);
    }
  }

  const envoyerLien = () =>
    agir(async () => {
      const { error } = await supabaseNavigateur().auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: adresseConfirmation(lireSuite()), shouldCreateUser: true },
      });
      if (error) throw error;
      setEnvoye(true);
    });

  const verifierCode = () =>
    agir(async () => {
      const { error } = await supabaseNavigateur().auth.verifyOtp({
        email: email.trim(),
        token: code.replace(/\s/g, ""),
        type: "email",
      });
      if (error) throw error;
      router.replace(lireSuite());
    });

  if (envoye) {
    return (
      <Carte className="mt-8 flex flex-col gap-5">
        <div className="text-center">
          <p className="text-3xl" aria-hidden>✉️</p>
          <h2 className="mt-2 font-medium">Vérifiez votre boîte mail</h2>
          <p className="mt-1 text-sm text-encre-doux">
            Un e-mail vient d&apos;être envoyé à <strong>{email}</strong>. Cliquez sur le lien qu&apos;il contient,
            ou saisissez le code indiqué. Pensez à regarder dans les courriers indésirables.
          </p>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); verifierCode(); }} className="flex flex-col gap-4">
          <Champ
            id="code"
            libelle="Code reçu par e-mail"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            className="text-center text-xl tracking-[0.3em]"
          />
          {erreur && <p className="text-sm text-alerte">{erreur}</p>}
          <Bouton type="submit" disabled={enCours || code.replace(/\s/g, "").length < 6}>
            {enCours ? "Vérification…" : "Valider le code"}
          </Bouton>
        </form>
        <Bouton variante="discret" onClick={() => { setEnvoye(false); setCode(""); setErreur(""); }}>
          Utiliser une autre adresse
        </Bouton>
      </Carte>
    );
  }

  return (
    <Carte className="mt-8">
      <form onSubmit={(e) => { e.preventDefault(); envoyerLien(); }} className="flex flex-col gap-4">
        <Champ
          id="email"
          libelle="Votre adresse e-mail professionnelle"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="contact@mon-entreprise.fr"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        {erreur && <p className="text-sm text-alerte">{erreur}</p>}
        <Bouton type="submit" disabled={enCours}>
          {enCours ? "Un instant…" : "Recevoir mon lien de connexion"}
        </Bouton>
        <p className="text-center text-sm text-encre-doux">
          Première visite ? Vous compléterez ensuite votre fiche, validée par l&apos;administration.
        </p>
      </form>
    </Carte>
  );
}
