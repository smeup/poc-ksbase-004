import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (file) => JSON.parse(readFileSync(new URL(`../public/data/${file}.json`, import.meta.url), "utf8"));

test("LAB Services è associata solo al dominio LAB con i due servizi richiesti", () => {
  const { environments } = read("application-domains");
  const { upps } = read("upp");
  const { microExecutors } = read("micro-executors");
  const upp = upps.find((item) => item.id === "X1_LAB");
  assert.equal(upp?.title, "LAB Services");
  assert.deepEqual(upp.microExecutorIds, ["me-java-smeuplab"]);
  const lab = environments.find((item) => item.id === "ges_49adv");
  assert.equal(lab?.grainInstance, "smeup-si");
  assert.deepEqual(environments.filter((item) => item.uppIds.includes("X1_LAB")).map((item) => item.id), ["ges_49adv"]);
  assert.ok(lab.microExecutorIds.includes("me-java-smeuplab"));
  const executor = microExecutors.find((item) => item.id === "me-java-smeuplab");
  assert.ok(Object.hasOwn(executor.uppConfigurationSchemas, "X1_LAB"));
  assert.deepEqual(executor.apis.map((api) => [api.id, api.uppIds, api.microExecutorId]), [
    ["X1_LAB_01", ["X1_LAB"], "me-java-smeuplab"],
    ["X1_LAB_02", ["X1_LAB"], "me-java-smeuplab"],
  ]);
});
