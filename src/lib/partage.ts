import { dateLongue } from "@/lib/dates";
import { nomMariage, type Intervenant, type Mariage } from "@/lib/types";

export function lienPersonnel(jeton: string) {
  const origine = typeof window !== "undefined" ? window.location.origin : "";
  return `${origine}/j/${jeton}`;
}

// « Sophie – Studio Lumière » -> « Sophie » ; « DJ Max » reste « DJ Max »
export function nomCourt(nom: string) {
  return nom.split(" – ")[0].trim();
}

export function messageInvitation(i: Pick<Intervenant, "nom" | "jeton">, m: Mariage) {
  const prenom = nomCourt(i.nom);
  return (
    `Bonjour ${prenom} ! Voici votre lien personnel pour le mariage de ${nomMariage(m)}, ` +
    `le ${dateLongue(m.date_mariage)} : ${lienPersonnel(i.jeton)}\n` +
    `Vous y trouverez vos horaires et les infos pratiques, mis à jour en temps réel. ` +
    `Gardez-le précieusement, il vous est réservé.`
  );
}

// Numéro au format international pour WhatsApp (06 12… -> 336 12…)
export function numeroInternational(tel: string) {
  const chiffres = tel.replace(/[^\d+]/g, "");
  if (chiffres.startsWith("+")) return chiffres.slice(1);
  if (chiffres.startsWith("00")) return chiffres.slice(2);
  if (chiffres.startsWith("0")) return "33" + chiffres.slice(1);
  return chiffres;
}

export function lienSms(tel: string | null, texte: string) {
  // « ?&body= » fonctionne à la fois sur iPhone et sur Android
  return `sms:${tel ? tel.replace(/[^\d+]/g, "") : ""}?&body=${encodeURIComponent(texte)}`;
}

export function lienWhatsApp(tel: string | null, texte: string) {
  return `https://wa.me/${tel ? numeroInternational(tel) : ""}?text=${encodeURIComponent(texte)}`;
}
