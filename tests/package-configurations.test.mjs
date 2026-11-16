import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getSchemaProperties } from "../src/schema-properties.ts";

const read = (file) => JSON.parse(readFileSync(new URL(`../public/data/${file}.json`, import.meta.url), "utf8"));

const leafPaths = (value, prefix = []) =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? Object.entries(value).flatMap(([key, child]) => leafPaths(child, [...prefix, key]))
    : [prefix];

test("i domini configurano solo package esistenti e proprietà previste dagli schemi", () => {
  const { environments } = read("application-domains");
  const { packages } = read("packages");
  const { microExecutors } = read("micro-executors");

  for (const domain of environments) {
    for (const [packageId, configuration] of Object.entries(domain.packageConfigurations)) {
      const pkg = packages.find((item) => item.id === packageId);
      assert.ok(pkg, `${domain.id}/${packageId}`);
      const schema = {
        allOf: pkg.microExecutorIds.map((id) => microExecutors.find((item) => item.id === id).packageConfigurationSchemas[packageId]),
      };
      const known = new Set(getSchemaProperties(schema).properties.map(({ segments }) => JSON.stringify(segments)));
      for (const path of leafPaths(configuration)) {
        assert.ok(known.has(JSON.stringify(path)), `${domain.id}/${packageId}: ${path.join(".")}`);
      }
    }
  }
});
