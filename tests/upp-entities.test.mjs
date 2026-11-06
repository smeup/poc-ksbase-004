import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { collectUppEntities, validateUppEntities } from "../src/upp-entities.ts";

const read = (file) => JSON.parse(readFileSync(new URL(`../public/data/${file}.json`, import.meta.url), "utf8"));

test("ogni UPP ha entità mock valide e identificate univocamente", () => {
  const { upps } = read("upp");
  for (const upp of upps) {
    validateUppEntities(upp.id, upp.entities);
    assert.ok(upp.entities.length > 0, upp.id);
  }
});

test("l'aggregazione rispetta le UPP del dominio e le standard", () => {
  const { upps } = read("upp");
  const { environments } = read("application-domains");
  const entitiesFor = (domainId) => {
    const domain = environments.find((item) => item.id === domainId);
    return collectUppEntities(upps.filter((upp) => upp.standardPlatform || domain.uppIds.includes(upp.id)));
  };
  const lab = entitiesFor("ges_49adv");
  assert.ok(lab.some(({ entity, upp }) => entity.id === "PROCESSO_SVILUPPO" && upp.id === "X1_LAB"));
  assert.ok(lab.some(({ entity, upp }) => entity.id === "EVENTO" && upp.id === "KS_194"));
  assert.ok(lab.some(({ entity, upp }) => entity.id === "OGGETTO_AS400" && upp.id === "B£_000"));
  assert.ok(!entitiesFor("ges_10adv").some(({ upp }) => upp.id === "X1_LAB"));
  assert.ok(entitiesFor("cliente-a").some(({ entity, upp }) => entity.id === "CLASSE_L64" && upp.id === "HO_000"));
  assert.ok(!entitiesFor("cliente-a").some(({ upp }) => upp.id === "B£_000"));
});

test("entità con ID uguali in UPP diverse restano distinte", () => {
  const entity = { id: "ENTITY", description: "Descrizione" };
  const upps = [{ id: "a", entities: [entity] }, { id: "b", entities: [entity] }];
  assert.deepEqual(collectUppEntities(upps).map(({ upp }) => upp.id), ["a", "b"]);
  assert.deepEqual(collectUppEntities([{ id: "empty", entities: [] }]), []);
});

test("liste mancanti, entità incomplete e duplicati sono errori", () => {
  assert.throws(() => validateUppEntities("x", undefined), /Elenco entità non valido/);
  assert.throws(() => validateUppEntities("x", [{ id: "A", description: " " }]), /Entità non valida/);
  assert.throws(() => validateUppEntities("x", [{ id: "A", description: "a" }, { id: "A", description: "b" }]), /duplicata/);
});
