// Tests du moteur de plan : npm test
import assert from "node:assert/strict";
const m = await import("./moteur.ts");
const { planExemple } = await import("./exemple.ts");
const { salleEnL, lireSalleEnL, dansSalle, contourSalle } = await import("./salle.ts");
const { normaliser } = await import("./normaliser.ts");
const inv = (n) => ({ id: "i" + n, nom: "Invité " + n });

const p = planExemple("Test");
assert.deepEqual(m.resume(p), { tables: 5, places: 48, invites: 0, nonPlaces: 0 });
assert.equal(m.alertes(p).messages.length, 0, "le plan d'exemple ne doit avoir aucune alerte");
// Deux tables collées → chevauchement
p.items[2].x = p.items[3].x; p.items[2].y = p.items[3].y - 150;
assert.ok(m.alertes(p).messages.some((a) => a.texte.includes("se chevauchent")));
// Table hors de la salle
const q = planExemple("Test"); q.items[2].x = -50;
assert.ok(m.alertes(q).messages.some((a) => a.texte.includes("dépasse")));
// Trop d'invités
const r = planExemple("Test"); r.items[2].guests = Array.from({ length: 12 }, (_, i) => inv(i));
assert.ok(m.alertes(r).messages.some((a) => a.texte.includes("12 invités pour 10 places")));

// Salle en L : une table dans la partie découpée dépasse
const L = planExemple("L"); L.room = salleEnL(2000, 1400, 800, 600, "haut-droite");
assert.deepEqual(lireSalleEnL(L.room), { dw: 800, dh: 600, coin: "haut-droite" });
assert.equal(dansSalle([1800, 200], contourSalle(L.room)), false);
assert.equal(dansSalle([500, 200], contourSalle(L.room)), true);
L.items = [{ id: "t", type: "round", name: "Table 9", x: 1700, y: 300, rot: 0, d: 160, chairs: 8, guests: [] }];
assert.ok(m.alertes(L).messages.some((a) => a.texte.includes("Table 9 dépasse")));
// … et une table à cheval sur le coin rentrant aussi
L.items[0].x = 1200; L.items[0].y = 600;
assert.ok(m.alertes(L).messages.some((a) => a.texte.includes("dépasse")), "coin rentrant");

// Porte : une table devant gêne l'ouverture
const P = planExemple("P");
P.items.push({ id: "po", type: "porte", name: "Porte 1", x: 330, y: 0, rot: 0, L: 90, sens: "droite", guests: [] });
P.items[2].y = 150;
assert.ok(m.alertes(P).messages.some((a) => a.texte.includes("gêne l'ouverture de Porte 1")));

// Numérotation de gauche à droite puis de haut en bas
const N = planExemple("N");
const ordre = m.numeroterTables(N).items.filter((e) => /^Table \d/.test(e.name)).sort((a, b) => a.name.localeCompare(b.name)).map((e) => [e.x, e.y]);
assert.deepEqual(ordre, [[330, 600], [1670, 600], [330, 1050], [1670, 1050]]);
assert.ok(m.numeroterTables(N).items.some((e) => e.name === "Table d'honneur"));

// Import d'une liste d'invités
const liste = m.lireListeInvites("Nom;Table;Menu\nMarie Dupont;3;végétarien\nPaul Martin;Table 1;enfant\nLéa\n");
assert.deepEqual(liste, [
  { nom: "Marie Dupont", table: "3", menu: "vegetarien" },
  { nom: "Paul Martin", table: "Table 1", menu: "enfant" },
  { nom: "Léa", table: undefined, menu: undefined },
]);
assert.equal(m.trouverTable(planExemple("x"), "3").name, "Table 3");
assert.equal(m.trouverTable(planExemple("x"), "honneur").name, "Table d'honneur");
assert.equal(m.texteMenus([{ id: 1, nom: "a", menu: "vegetarien" }, { id: 2, nom: "b", menu: "vegetarien" }, { id: 3, nom: "c", menu: "enfant" }]), "1 enfant, 2 végé");

// Ancien format (prototype) : invités = simples noms
const ancien = normaliser({ name: "Vieux", room: { w: 1000, h: 800 }, passage: 90, items: [{ id: "a", type: "round", name: "Table 1", x: 300, y: 300, rot: 0, d: 160, chairs: 8, guests: ["Marie", "Paul"] }] });
assert.equal(ancien.items[0].guests[1].nom, "Paul");
assert.ok(ancien.items[0].guests[0].id);
assert.deepEqual(ancien.nonPlaces, []);
assert.ok(m.recapitulatif(ancien).includes("Marie"));

assert.equal(m.estPlanValide({ room: { w: 1, h: 1 }, items: [] }), true);
assert.equal(m.estPlanValide({ nimporte: 1 }), false);
console.log("Moteur du plan de salle : tous les tests passent ✓");
