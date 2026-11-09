// Traduit les messages d'erreur techniques en phrases claires, en français.
export function messageErreur(erreur: { message?: string; code?: string } | null): string {
  if (!erreur) return "";
  const m = (erreur.message ?? "").toLowerCase();
  if (m.includes("rate limit") || m.includes("security purposes") || erreur.code === "over_email_send_rate_limit")
    return "Trop d'e-mails envoyés en peu de temps. Patientez quelques minutes avant de réessayer.";
  if (m.includes("expired") || m.includes("invalid") || erreur.code === "otp_expired")
    return "Ce lien ou ce code n'est plus valable. Demandez-en un nouveau.";
  if (m.includes("email") && m.includes("valid"))
    return "Cette adresse e-mail ne semble pas valide.";
  if (m.includes("fetch") || m.includes("network"))
    return "Impossible de joindre le serveur. Vérifiez votre connexion internet.";
  return "Une erreur est survenue. Merci de réessayer.";
}
