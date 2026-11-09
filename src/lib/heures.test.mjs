// Petit test des conversions d'heures : node --experimental-strip-types src/lib/heures.test.mjs
import assert from "node:assert/strict";
const h = await import("./heures.ts");
const tz = "Europe/Paris";
// Été (UTC+2)
assert.equal(h.versInstant("2027-06-12", "14:00", tz), "2027-06-12T12:00:00.000Z");
// Après minuit -> lendemain
assert.equal(h.versInstant("2027-06-12", "01:30", tz), "2027-06-12T23:30:00.000Z");
// Hiver (UTC+1)
assert.equal(h.versInstant("2027-12-18", "15:00", tz), "2027-12-18T14:00:00.000Z");
// Nuit du passage à l'heure d'hiver (31 octobre 2027 à 3 h -> 2 h)
assert.equal(h.versInstant("2027-10-30", "23:00", tz), "2027-10-30T21:00:00.000Z");
assert.equal(h.versInstant("2027-10-30", "04:00", tz), "2027-10-31T03:00:00.000Z");
assert.equal(h.heureAffichee("2027-06-12T23:30:00.000Z", tz), "01h30");
assert.equal(h.heureSaisie("2027-06-12T12:00:00.000Z", tz), "14:00");
assert.equal(h.estApresMinuit("2027-06-12T23:30:00.000Z", "2027-06-12", tz), true);
assert.equal(h.estApresMinuit("2027-06-12T21:30:00.000Z", "2027-06-12", tz), false);
// Changement de date d'hiver à été : même heure locale
assert.equal(h.decalerDeJours("2026-11-09T14:45:00.000Z", 215, tz), "2027-06-12T13:45:00.000Z");
assert.equal(h.decalerDeJours("2027-06-12T23:30:00.000Z", -1, tz), "2027-06-11T23:30:00.000Z");
assert.equal(h.dureeLisible(90), "1 h 30");
assert.equal(h.dureeLisible(45), "45 min");
assert.equal(h.dureeLisible(120), "2 h");
console.log("Conversions d'heures : tous les tests passent ✓");
