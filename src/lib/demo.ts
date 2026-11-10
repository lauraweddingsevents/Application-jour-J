"use client";
// Crée un mariage de démonstration complet (déroulé de 14 h à 2 h,
// une dizaine d'intervenants, fiche pratique) pour tester l'application.
// Les numéros de téléphone sont fictifs.
import { supabaseNavigateur } from "@/lib/supabase/navigateur";
import { versInstant, ajouterMinutes } from "@/lib/heures";
import { estTempsFort, type Categorie, type CategorieFiche, type Visibilite } from "@/lib/types";

const FUSEAU = "Europe/Paris";

const INTERVENANTS: {
  cle: string;
  nom: string;
  role: string;
  categorie: Categorie;
  telephone?: string;
  coordination?: boolean;
}[] = [
  { cle: "wp", nom: "Laura", role: "Wedding planner", categorie: "prestataire", telephone: "06 00 00 00 01", coordination: true },
  { cle: "lieu", nom: "Marc – Château de la Roseraie", role: "Lieu de réception", categorie: "prestataire", telephone: "06 00 00 00 02" },
  { cle: "photo", nom: "Sophie – Studio Lumière", role: "Photographe", categorie: "prestataire", telephone: "06 00 00 00 03" },
  { cle: "video", nom: "Hugo", role: "Vidéaste", categorie: "prestataire", telephone: "06 00 00 00 04" },
  { cle: "traiteur", nom: "Maison Délices", role: "Traiteur", categorie: "prestataire", telephone: "06 00 00 00 05" },
  { cle: "dj", nom: "DJ Max", role: "DJ", categorie: "prestataire", telephone: "06 00 00 00 06" },
  { cle: "musique", nom: "Quatuor Opaline", role: "Musiciens", categorie: "prestataire" },
  { cle: "fleurs", nom: "Fleurs de Lise", role: "Fleuriste", categorie: "prestataire" },
  { cle: "clara", nom: "Clara", role: "Témoin", categorie: "proche", telephone: "06 00 00 00 07", coordination: true },
  { cle: "thomas", nom: "Thomas", role: "Témoin", categorie: "proche", telephone: "06 00 00 00 08" },
  { cle: "martine", nom: "Martine", role: "Mère de la mariée", categorie: "proche" },
];

const MOMENTS: { heure: string; duree: number; titre: string; lieu?: string; notes?: string; qui: string[] }[] = [
  { heure: "14:00", duree: 60, titre: "Préparatifs et photos des mariés", lieu: "Suite nuptiale", qui: ["photo", "video"], notes: "Détails à photographier : alliances, faire-part, chaussures." },
  { heure: "14:30", duree: 45, titre: "Installation florale de la cérémonie", lieu: "Jardin des oliviers", qui: ["fleurs", "lieu"] },
  { heure: "15:15", duree: 30, titre: "Accueil des invités", lieu: "Jardin des oliviers", qui: ["wp", "clara", "thomas", "musique"], notes: "Distribuer les cônes de pétales à l'entrée." },
  { heure: "15:45", duree: 45, titre: "Cérémonie laïque", lieu: "Jardin des oliviers", qui: ["wp", "photo", "video", "musique", "clara", "thomas"], notes: "Entrée de la mariée : Canon de Pachelbel. Thomas garde les alliances." },
  { heure: "16:30", duree: 15, titre: "Sortie des mariés et lancer de pétales", lieu: "Allée centrale", qui: ["photo", "video", "clara", "thomas"] },
  { heure: "16:45", duree: 30, titre: "Photo de groupe", lieu: "Escalier du château", qui: ["photo", "martine", "clara"], notes: "Martine a la liste des groupes familiaux." },
  { heure: "17:00", duree: 120, titre: "Vin d'honneur", lieu: "Terrasse", qui: ["traiteur", "musique", "wp"] },
  { heure: "17:30", duree: 45, titre: "Séance photo de couple", lieu: "Parc du château", qui: ["photo", "video"] },
  { heure: "19:30", duree: 30, titre: "Installation des invités en salle", lieu: "Orangerie", qui: ["lieu", "traiteur", "wp"] },
  { heure: "20:00", duree: 10, titre: "Entrée des mariés", lieu: "Orangerie", qui: ["dj", "photo", "video"], notes: "Musique : « Signed, Sealed, Delivered »." },
  { heure: "20:15", duree: 135, titre: "Dîner", lieu: "Orangerie", qui: ["traiteur"] },
  { heure: "21:30", duree: 15, titre: "Discours des témoins", lieu: "Orangerie", qui: ["clara", "thomas", "dj"], notes: "Micro sans fil prêt sur la table d'honneur." },
  { heure: "22:30", duree: 15, titre: "Pièce montée", lieu: "Orangerie", qui: ["traiteur", "photo", "video"] },
  { heure: "22:45", duree: 15, titre: "Ouverture de bal", lieu: "Piste de danse", qui: ["dj", "photo", "video"] },
  { heure: "23:00", duree: 150, titre: "Soirée dansante", lieu: "Piste de danse", qui: ["dj"] },
  { heure: "00:30", duree: 30, titre: "Buffet de nuit", lieu: "Orangerie", qui: ["traiteur"] },
  { heure: "01:30", duree: 30, titre: "Fin de soirée et départ des navettes", lieu: "Cour d'honneur", qui: ["wp", "lieu", "dj"], notes: "Navettes à 1 h 30 et 2 h vers Libourne." },
];

const FICHE: {
  categorie: CategorieFiche;
  titre: string;
  contenu?: string;
  telephone?: string;
  adresse?: string;
  visibilite: Visibilite;
}[] = [
  { categorie: "contact", titre: "Laura – Wedding planner", telephone: "06 00 00 00 01", contenu: "Pour toute question le jour J.", visibilite: "tous" },
  { categorie: "contact", titre: "Marc – Régisseur du château", telephone: "06 00 00 00 02", visibilite: "prestataires" },
  { categorie: "adresse", titre: "Château de la Roseraie", adresse: "Château de la Roseraie, Saint-Émilion", contenu: "Parking invités à droite de l'allée principale.", visibilite: "tous" },
  { categorie: "adresse", titre: "Entrée des prestataires", adresse: "Saint-Émilion", contenu: "Portail nord, par le chemin des Vignes. Déchargement devant l'orangerie.", visibilite: "prestataires" },
  { categorie: "meteo", titre: "En cas de pluie", contenu: "La cérémonie a lieu sous la grande orangerie. Décision prise à 12 h par Laura, qui prévient tout le monde.", visibilite: "tous" },
  { categorie: "note", titre: "Code du portail", contenu: "2580", visibilite: "prestataires" },
  { categorie: "note", titre: "Fin de la musique", contenu: "Musique amplifiée coupée à 2 h (arrêté municipal).", visibilite: "prestataires" },
  { categorie: "note", titre: "Navettes", contenu: "Départs à 1 h 30 et 2 h depuis la cour d'honneur vers les hôtels de Libourne.", visibilite: "tous" },
];

function aujourdhuiParis() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSEAU,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function verifier<T>(res: { data: T | null; error: unknown }): T {
  if (res.error) throw res.error;
  return res.data as T;
}

// Renvoie l'identifiant du mariage créé
export async function creerMariageDemo(date = aujourdhuiParis()): Promise<string> {
  const supabase = supabaseNavigateur();

  const mariage = verifier<{ id: string }>(
    await supabase
      .from("mariages")
      .insert({
        nom_marie_1: "Camille",
        nom_marie_2: "Julien",
        date_mariage: date,
        lieu_principal: "Château de la Roseraie (démonstration)",
        delai_alerte_defaut: 15,
      })
      .select("id")
      .single(),
  );

  const intervenants = verifier<{ id: string; nom: string }[]>(
    await supabase
      .from("intervenants")
      .insert(
        INTERVENANTS.map((i, ordre) => ({
          mariage_id: mariage.id,
          nom: i.nom,
          role: i.role,
          categorie: i.categorie,
          telephone: i.telephone ?? null,
          acces_coordination: Boolean(i.coordination),
          ordre,
        })),
      )
      .select("id, nom"),
  );
  const idParCle = new Map(
    INTERVENANTS.map((i) => [i.cle, intervenants.find((x) => x.nom === i.nom)!.id]),
  );

  const moments = verifier<{ id: string; titre: string }[]>(
    await supabase
      .from("moments")
      .insert(
        MOMENTS.map((m, ordre) => {
          const debut = versInstant(date, m.heure, FUSEAU);
          return {
            mariage_id: mariage.id,
            titre: m.titre,
            debut,
            fin: ajouterMinutes(debut, m.duree),
            lieu: m.lieu ?? null,
            notes: m.notes ?? null,
            raccourci: estTempsFort(m.titre),
            ordre,
          };
        }),
      )
      .select("id, titre"),
  );

  verifier(
    await supabase.from("moment_intervenants").insert(
      MOMENTS.flatMap((m) => {
        const momentId = moments.find((x) => x.titre === m.titre)!.id;
        return m.qui.map((cle) => ({ moment_id: momentId, intervenant_id: idParCle.get(cle)! }));
      }),
    ),
  );

  verifier(
    await supabase.from("fiche_elements").insert(
      FICHE.map((f, ordre) => ({
        mariage_id: mariage.id,
        categorie: f.categorie,
        titre: f.titre,
        contenu: f.contenu ?? null,
        telephone: f.telephone ?? null,
        adresse: f.adresse ?? null,
        visibilite: f.visibilite,
        ordre,
      })),
    ),
  );

  return mariage.id;
}
