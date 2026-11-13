import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (file) => JSON.parse(readFileSync(new URL(`../public/data/${file}.json`, import.meta.url), "utf8"));

test("LAB Services appartiene all'istanza Smeup SI ed è configurata dai suoi domini", () => {
  const { environments } = read("application-domains");
  const { grainInstances } = read("grain-instances");
  const { upps } = read("upp");
  const { microExecutors } = read("micro-executors");
  const upp = upps.find((item) => item.id === "X1_LAB");
  assert.equal(upp?.title, "LAB Services");
  assert.deepEqual(upp.microExecutorIds, ["me-java-smeuplab"]);
  const lab = environments.find((item) => item.id === "ges_49adv");
  assert.equal(lab?.grainInstance, "smeup-si");
  assert.deepEqual(grainInstances.filter((item) => item.uppIds.includes("X1_LAB")).map((item) => item.id), ["smeup-si"]);
  assert.equal(lab.uppConfigurations.X1_LAB.lab.repository, "smeup/lab-services");
  assert.ok(!Object.hasOwn(environments.find((item) => item.id === "ges_10adv").uppConfigurations, "X1_LAB"));
  assert.ok(environments.every((item) => item.grainInstance === "smeup-si" || !Object.hasOwn(item.uppConfigurations, "X1_LAB")));
  const executor = microExecutors.find((item) => item.id === "me-java-smeuplab");
  assert.ok(Object.hasOwn(executor.uppConfigurationSchemas, "X1_LAB"));
  assert.deepEqual(executor.apis.map((api) => [api.id, api.uppIds, api.microExecutorId]), [
    ["X1_LAB_01", ["X1_LAB"], "me-java-smeuplab"],
    ["X1_LAB_02", ["X1_LAB"], "me-java-smeuplab"],
  ]);
});
