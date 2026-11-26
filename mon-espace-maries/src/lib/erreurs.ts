// Traduit les messages d'erreur techniques en phrases claires (français ou anglais).
type ErreurBrute = { message?: string; code?: string } | null | undefined;

const TEXTES = {
  fr: {
    limite: "Trop d'e-mails envoyés en peu de temps. Patientez quelques minutes avant de réessayer.",
    lien: "Ce lien ou ce code n'est plus valable. Demandez-en un nouveau.",
    email: "Cette adresse e-mail ne semble pas valide.",
    inconnue: "Cette adresse n'est pas reconnue. Utilisez celle que vous avez donnée à Laura, ou contactez-la.",
    acces: "Vous n'avez pas accès à cette information.",
    doublon: "Cet élément existe déjà.",
    valeur: "Une des valeurs saisies n'est pas valide. Vérifiez le formulaire.",
    reseau: "Impossible de joindre le serveur. Vérifiez votre connexion internet.",
    autre: "Une erreur est survenue. Merci de réessayer.",
  },
  en: {
    limite: "Too many emails sent in a short time. Please wait a few minutes and try again.",
    lien: "This link or code is no longer valid. Please request a new one.",
    email: "This email address doesn't look valid.",
    inconnue: "This address isn't recognised. Use the one you gave Laura, or contact her.",
    acces: "You don't have access to this information.",
    doublon: "This item already exists.",
    valeur: "One of the values isn't valid. Please check the form.",
    reseau: "Unable to reach the server. Please check your internet connection.",
    autre: "Something went wrong. Please try again.",
  },
};

export function messageErreur(erreur: ErreurBrute, langue: "fr" | "en" = "fr"): string {
  if (!erreur) return "";
  const t = TEXTES[langue];
  const m = (erreur.message ?? "").toLowerCase();
  const code = erreur.code ?? "";

  if (m.includes("adresse_inconnue") || m.includes("database error saving new user") || m.includes("signups not allowed"))
    return t.inconnue;
  if (code === "over_email_send_rate_limit" || m.includes("rate limit") || m.includes("security purposes")) return t.limite;
  if (code === "otp_expired" || ((m.includes("token") || m.includes("otp") || m.includes("link")) && (m.includes("expired") || m.includes("invalid"))))
    return t.lien;
  if (code === "email_address_invalid" || (m.includes("email") && m.includes("invalid"))) return t.email;
  // Messages rédigés en français directement dans la base (ex. « Six versements au maximum »)
  if (code === "P0001" && erreur.message) return erreur.message;
  if (code === "42501" || m.includes("row-level security") || m.includes("permission denied")) return t.acces;
  if (code === "23505") return t.doublon;
  if (code === "23514" || code === "22007" || code === "22008" || code === "22P02") return t.valeur;
  if (m.includes("failed to fetch") || m.includes("network") || m.includes("load failed")) return t.reseau;
  return t.autre;
}
