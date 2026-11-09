import assert from "node:assert/strict";
const { echangerMoments } = await import("./reorganiser.ts");
const m = (id, debut, fin, ordre = 0) => ({ id, debut, fin, ordre, titre: id, mariage_id: "x", lieu: null, notes: null, intervenants: [] });
// Contigus : A 14:00-15:00, B 15:00-15:30 -> B 14:00-14:30, A 14:30-15:30
let [a, b] = echangerMoments(m("A", "2027-06-12T12:00:00.000Z", "2027-06-12T13:00:00.000Z"), m("B", "2027-06-12T13:00:00.000Z", "2027-06-12T13:30:00.000Z", 1));
assert.deepEqual([b.debut, b.fin], ["2027-06-12T12:00:00.000Z", "2027-06-12T12:30:00.000Z"]);
assert.deepEqual([a.debut, a.fin], ["2027-06-12T12:30:00.000Z", "2027-06-12T13:30:00.000Z"]);
// Non contigus : A 14:00 (sans fin), B 16:00-17:00 -> B 14:00-15:00, A 16:00
[a, b] = echangerMoments(m("A", "2027-06-12T12:00:00.000Z", null), m("B", "2027-06-12T14:00:00.000Z", "2027-06-12T15:00:00.000Z"));
assert.deepEqual([b.debut, b.fin, a.debut, a.fin], ["2027-06-12T12:00:00.000Z", "2027-06-12T13:00:00.000Z", "2027-06-12T14:00:00.000Z", null]);
// Même heure : seul l'ordre change
[a, b] = echangerMoments(m("A", "2027-06-12T12:00:00.000Z", null, 0), m("B", "2027-06-12T12:00:00.000Z", null, 0));
assert.ok(b.ordre < a.ordre, "B doit passer devant A");
console.log("Réordonnancement : tous les tests passent ✓");
