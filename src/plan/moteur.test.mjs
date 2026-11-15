// Tests du moteur de plan : npm test
import assert from "node:assert/strict";
const m = await import("./moteur.ts");
const { planExemple } = await import("./exemple.ts");
const p = planExemple("Test");
assert.deepEqual(m.resume(p), { tables: 5, places: 48, invites: 0 });
assert.equal(m.alertes(p).messages.length, 0, "le plan d'exemple ne doit avoir aucune alerte");
// Deux tables collées → chevauchement
p.items[2].x = p.items[3].x; p.items[2].y = p.items[3].y - 150;
assert.ok(m.alertes(p).messages.some((a) => a.texte.includes("se chevauchent")));
// Table hors de la salle
const q = planExemple("Test"); q.items[2].x = -50;
assert.ok(m.alertes(q).messages.some((a) => a.texte.includes("dépasse")));
// Trop d'invités
const r = planExemple("Test"); r.items[2].guests = Array.from({ length: 12 }, (_, i) => `Invité ${i}`);
assert.ok(m.alertes(r).messages.some((a) => a.texte.includes("12 invités pour 10 places")));
assert.equal(m.estPlanValide({ room: { w: 1, h: 1 }, items: [] }), true);
assert.equal(m.estPlanValide({ nimporte: 1 }), false);
console.log("Moteur du plan de salle : tous les tests passent ✓");
