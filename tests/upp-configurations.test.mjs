import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getSchemaProperties } from "../src/schema-properties.ts";

const read = (file) => JSON.parse(readFileSync(new URL(`../public/data/${file}.json`, import.meta.url), "utf8"));

const leafPaths = (value, prefix = []) =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? Object.entries(value).flatMap(([key, child]) => leafPaths(child, [...prefix, key]))
    : [prefix];

test("i domini configurano solo UPP della propria istanza e proprietà previste dagli schemi", () => {
  const { grainInstances } = read("grain-instances");
  const { environments } = read("application-domains");
  const { upps } = read("upp");
  const { microExecutors } = read("micro-executors");

  for (const domain of environments) {
    const instance = grainInstances.find((item) => item.id === domain.grainInstance);
    for (const [uppId, configuration] of Object.entries(domain.uppConfigurations)) {
      const upp = upps.find((item) => item.id === uppId);
      assert.ok(upp?.standardPlatform || instance.uppIds.includes(uppId), `${domain.id}/${uppId}`);
      const schema = {
        allOf: upp.microExecutorIds.map((id) => microExecutors.find((item) => item.id === id).uppConfigurationSchemas[uppId]),
      };
      const known = new Set(getSchemaProperties(schema).properties.map(({ segments }) => JSON.stringify(segments)));
      for (const path of leafPaths(configuration)) {
        assert.ok(known.has(JSON.stringify(path)), `${domain.id}/${uppId}: ${path.join(".")}`);
      }
    }
  }
});
