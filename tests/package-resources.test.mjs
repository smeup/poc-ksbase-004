import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { groupResourcesByCategory, parsePackageResources } from "../src/package-resources.ts";

const catalog = JSON.parse(readFileSync(new URL("../public/data/packages.json", import.meta.url), "utf8"));

test("i package del catalogo hanno risorse valide", () => {
  for (const pkg of catalog.packages) {
    assert.doesNotThrow(() => parsePackageResources(pkg.name, pkg.resources));
  }
});

test("raggruppa per categoria nell'ordine previsto, omettendo le categorie vuote", () => {
  const items = parsePackageResources("p", [
    { name: "c", type: "container", image: "redis:7" },
    { name: "m", type: "mongo" },
    { name: "r", type: "rabbitmq" },
    { name: "pg", type: "postgres" },
  ]).map((resource) => ({ resource }));
  const groups = groupResourcesByCategory(items);
  assert.deepEqual(groups.map((group) => group.id), ["datasource", "message-broker", "container"]);
  assert.deepEqual(groups[0].items.map(({ resource }) => resource.name), ["m", "pg"]);
  assert.deepEqual(groupResourcesByCategory(items.slice(0, 1)).map((group) => group.id), ["container"]);
});

test("rifiuta tipi sconosciuti, duplicati e container senza immagine", () => {
  assert.deepEqual(parsePackageResources("p", undefined), []);
  assert.throws(() => parsePackageResources("p", {}), /non valide/);
  assert.throws(() => parsePackageResources("p", [{ name: "x", type: "mysql" }]), /Tipo non valido/);
  assert.throws(() => parsePackageResources("p", [{ name: "x", type: "mongo" }, { name: "x", type: "mongo" }]), /duplicata/);
  assert.throws(() => parsePackageResources("p", [{ name: "x", type: "container" }]), /Immagine mancante/);
  assert.throws(() => parsePackageResources("p", [{ name: "x", type: "mongo", version: 7 }]), /version non valido/);
});
