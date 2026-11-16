import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { collectPackageEntities, validatePackageEntities } from "../src/package-entities.ts";

const read = (file) => JSON.parse(readFileSync(new URL(`../public/data/${file}.json`, import.meta.url), "utf8"));

test("ogni package ha entità mock valide e identificate univocamente", () => {
  const { packages } = read("packages");
  for (const pkg of packages) {
    validatePackageEntities(pkg.id, pkg.entities);
    assert.ok(pkg.entities.length > 0, pkg.id);
  }
});

test("l'aggregazione include le entità di tutti i package", () => {
  const rows = collectPackageEntities(read("packages").packages);
  assert.ok(rows.some(({ entity, pkg }) => entity.id === "OGGETTO_AS400" && pkg.id === "smeup-es"));
  assert.ok(rows.some(({ entity, pkg }) => entity.id === "CLASSE_L64" && pkg.id === "holos"));
  assert.ok(rows.some(({ entity, pkg }) => entity.id === "OGGETTO_CORE" && pkg.id === "smeup-multipiattaforma"));
});

test("entità con ID uguali in package diversi restano distinte", () => {
  const entity = { id: "ENTITY", description: "Descrizione" };
  const packages = [{ id: "a", entities: [entity] }, { id: "b", entities: [entity] }];
  assert.deepEqual(collectPackageEntities(packages).map(({ pkg }) => pkg.id), ["a", "b"]);
  assert.deepEqual(collectPackageEntities([{ id: "empty", entities: [] }]), []);
});

test("liste mancanti, entità incomplete e duplicati sono errori", () => {
  assert.throws(() => validatePackageEntities("x", undefined), /Elenco entità non valido/);
  assert.throws(() => validatePackageEntities("x", [{ id: "A", description: " " }]), /Entità non valida/);
  assert.throws(() => validatePackageEntities("x", [{ id: "A", description: "a" }, { id: "A", description: "b" }]), /duplicata/);
});
