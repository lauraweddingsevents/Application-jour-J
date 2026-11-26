// Titre et texte d'une notification, dans la langue du couple (Laura : en français).
// Utilisé par l'appli (liste des notifications) et par le serveur (e-mails, téléphone).
import { centimes, formatDate, formatDateHeure, formatEuros, type Langue } from "./calculs";
import { dico } from "./i18n";

type N = { type: string; donnees: Record<string, unknown> };

const quand = (d: Record<string, unknown>, langue: Langue) =>
  typeof d.debut === "string" && d.debut ? formatDateHeure(d.debut, langue) : typeof d.date_a_fixer === "string" ? d.date_a_fixer : "";

export function texteNotificationCouple(n: N, langue: Langue): { titre: string; texte: string } {
  const t = dico(langue).notif;
  const d = n.donnees ?? {};
  const date = typeof d.date_butoir === "string" ? formatDate(d.date_butoir, langue) : "";
  switch (n.type) {
    case "paiement_confirme": return t.paiement_confirme(d, formatEuros(centimes(d.montant as number), langue));
    case "nouvelle_tache": return t.nouvelle_tache(d, date);
    case "rappel_tache": return t.rappel_tache(d, date);
    case "rdv_laura": return t.rdv_laura(d, quand(d, langue));
    case "rappel_rdv": return t.rappel_rdv(d, quand(d, langue));
    case "document_relu": return t.document_relu(d);
    case "album_ouvert": return t.album_ouvert();
    default: return { titre: dico(langue).appli, texte: "" };
  }
}

export function texteNotificationAdmin(n: N, noms: string): { titre: string; texte: string } {
  const d = n.donnees ?? {};
  switch (n.type) {
    case "virement_declare":
      return { titre: `Virement déclaré · ${noms}`, texte: `« ${d.libelle} » (${formatEuros(centimes(d.montant as number))}) : à confirmer à réception.` };
    case "document_depose":
      return { titre: `Document à relire · ${noms}`, texte: `${d.nom}` };
    case "questionnaire_termine":
      return { titre: `Questionnaire terminé · ${noms}`, texte: "Les deux mariés ont répondu à toutes les questions. Vous pouvez poser vos verdicts." };
    case "rdv_couple":
      return { titre: `Rendez-vous ajouté · ${noms}`, texte: `${d.titre}${quand(d, "fr") ? ` · ${quand(d, "fr")}` : ""}` };
    default:
      return { titre: noms, texte: "" };
  }
}
