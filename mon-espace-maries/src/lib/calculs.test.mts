// Tests des calculs : npm test
import assert from "node:assert/strict";
import {
  albumOuvert, avancement, depuisInstant, derouleDefinitif, ecart, formatEcart, formatEuros, formatHeure,
  joursAvant, ouvertureAlbum, prochaineEcheance, soldeTropTard, statutEtape, totauxBudget, totauxPaiements,
  dateSuppression, versInstant, ajouterMois,
} from "./calculs.ts";

let n = 0;
function test(nom: string, f: () => void) {
  f();
  n++;
  console.log("✓", nom);
}

test("statut d'une recherche calculé depuis ses sous-étapes", () => {
  assert.equal(statutEtape("pas_commence", ["termine", "termine", "termine", "termine", "termine"]), "termine");
  assert.equal(statutEtape("pas_commence", ["termine", "pas_commence", "pas_commence", "pas_commence", "pas_commence"]), "en_cours");
  assert.equal(statutEtape("termine", ["pas_commence", "pas_commence"]), "pas_commence");
  assert.equal(statutEtape("en_cours", []), "en_cours");
});

test("avancement : seules les étapes « Terminé » comptent", () => {
  assert.equal(avancement(["termine", "termine", "en_cours", "pas_commence"]), 50);
  assert.equal(avancement(["termine", "termine", "termine", "termine", "en_cours", "en_cours", "pas_commence", "pas_commence", "pas_commence", "pas_commence"]), 40);
  assert.equal(avancement([]), 0);
});

test("budget exact au centime", () => {
  assert.equal(ecart({ estime: "0.1", reel: "0.3" }), 20);
  assert.equal(ecart({ estime: 9500, reel: 9850 }), 35000);
  assert.equal(ecart({ estime: 1500, reel: null }), null);
  const t = totauxBudget([{ estime: 8000, reel: 8000 }, { estime: 9500, reel: 9850.55 }, { estime: 1800, reel: null }, { estime: null, reel: 12.3 }]);
  assert.equal(t.estime, 1930000);
  assert.equal(t.reajuste, 800000 + 985055 + 180000 + 1230);
  assert.match(formatEcart(35000), /^\+350\s€$/u);
});

test("affichage des montants", () => {
  assert.match(formatEuros(3295000), /^32\s950\s€$/u);
  assert.match(formatEuros(123456), /^1\s234,56\s€$/u);
  assert.equal(formatEuros(123456, "en"), "€1,234.56");
  assert.equal(formatEcart(-15000, "en"), "−€150");
  assert.equal(formatEuros(null), "—");
});

test("paiements : déjà réglé, reste à régler, prochaine échéance", () => {
  const e = [
    { montant: 900, statut: "paye", date_prevue: "2026-10-15" },
    { montant: "700.50", statut: "a_confirmer", date_prevue: "2026-11-15" },
    { montant: 700, statut: "a_venir", date_prevue: "2027-03-15" },
  ];
  assert.deepEqual(totauxPaiements(e), { regle: 90000, reste: 140050 });
  assert.equal(prochaineEcheance(e)?.date_prevue, "2026-11-15");
});

test("solde au plus tard un mois avant le mariage", () => {
  assert.equal(soldeTropTard([{ montant: 1, statut: "a_venir", date_prevue: "2027-08-11" }], "2027-09-11"), false);
  assert.equal(soldeTropTard([{ montant: 1, statut: "a_venir", date_prevue: "2027-08-12" }], "2027-09-11"), true);
  assert.equal(ajouterMois("2027-03-31", -1), "2027-02-28");
});

test("décompte J-X à l'heure de Paris", () => {
  assert.equal(joursAvant("2027-09-11", new Date("2027-09-10T21:59:00Z")), 1);
  assert.equal(joursAvant("2027-09-11", new Date("2027-09-10T22:01:00Z")), 0); // minuit passé à Paris
  assert.equal(joursAvant("2027-09-11", new Date("2027-09-13T10:00:00Z")), -2);
});

test("album : lendemain du mariage, 10 h à Paris (été et hiver)", () => {
  assert.equal(ouvertureAlbum("2027-09-11").toISOString(), "2027-09-12T08:00:00.000Z");
  assert.equal(ouvertureAlbum("2027-01-15").toISOString(), "2027-01-16T09:00:00.000Z");
  assert.equal(albumOuvert("2027-09-11", new Date("2027-09-12T07:59:00Z")), false);
  assert.equal(albumOuvert("2027-09-11", new Date("2027-09-12T08:00:00Z")), true);
});

test("déroulé définitif à partir d'un mois avant", () => {
  assert.equal(derouleDefinitif("2027-09-11", new Date("2027-08-10T12:00:00Z")), false);
  assert.equal(derouleDefinitif("2027-09-11", new Date("2027-08-11T12:00:00Z")), true);
});

test("suppression 6 mois après le mariage", () => {
  assert.equal(dateSuppression("2027-09-11"), "2028-03-11");
  assert.equal(dateSuppression("2027-08-31"), "2028-02-29");
});

test("heures et saisie de rendez-vous", () => {
  assert.equal(formatHeure("2027-01-12T17:00:00Z"), "18 h");
  assert.equal(formatHeure("2027-07-12T12:30:00Z"), "14 h 30");
  assert.equal(formatHeure("2027-07-12T12:30:00Z", "en"), "2:30 pm");
  assert.equal(versInstant("2027-07-12", "14:30"), "2027-07-12T12:30:00.000Z");
  assert.deepEqual(depuisInstant("2027-07-12T12:30:00.000Z"), { date: "2027-07-12", heure: "14:30" });
});

console.log(`\n${n} groupes de tests réussis.`);
