import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (file) => JSON.parse(readFileSync(new URL(`../public/data/${file}.json`, import.meta.url), "utf8"));

test("i codici dei connettori sono coerenti in domini, servizi e schemi", () => {
  const { environments } = read("application-domains");
  const { upps } = read("upp");
  const { microExecutors } = read("micro-executors");
  const cases = [
    {
      id: "B£_000",
      title: "AS400 Connector",
      domains: ["ges_10adv", "ges_49adv", "ges_11adv"],
      executor: "me-java-as400proxy",
      services: ["LOA10_SE", "WESER_23", "JATRE_18C"],
    },
    {
      id: "HO_000",
      title: "L64 Connector",
      domains: ["cliente-a", "cliente-b"],
      executor: "me-node-holos",
      services: ["HO_000_01", "HO_000_02"],
    },
  ];

  for (const { id, title, domains, executor, services } of cases) {
    const upp = upps.find((item) => item.title === title);
    assert.equal(upp?.id, id);
    assert.deepEqual(upp.microExecutorIds, [executor]);
    assert.deepEqual(environments.filter((item) => item.uppIds.includes(id)).map((item) => item.id), domains);
    const microExecutor = microExecutors.find((item) => item.id === executor);
    assert.ok(Object.hasOwn(microExecutor.uppConfigurationSchemas, id));
    assert.deepEqual(microExecutor.apis.filter((api) => api.uppIds.includes(id)).map((api) => api.id), services);
  }
  const text = JSON.stringify({ environments, upps, microExecutors });
  assert.ok(!text.includes("upp-as400-connector") && !text.includes("upp-l64-connector"));
});
