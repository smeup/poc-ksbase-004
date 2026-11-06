import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { parseDomainCapacities } from "../src/domain-capacity.ts";

const read = (file) => JSON.parse(readFileSync(new URL(`../public/data/${file}.json`, import.meta.url), "utf8"));

test("ogni dominio esistente ha valori mock distinti e validi", () => {
  const capacities = parseDomainCapacities(read("domain-capacity"));
  const { environments } = read("application-domains");
  assert.deepEqual(capacities.map((item) => item.domainId), environments.map((item) => item.id));
  assert.notDeepEqual(capacities[0], capacities[1]);
  assert.equal(capacities.find((item) => item.domainId === "ges_49adv").requestsPerMinute, 180);
});

test("rifiuta formati errati, numeri non validi e duplicati", () => {
  const good = { domainId: "a", requestsPerMinute: 60, maxRequestBytes: 1000, costPerCallMicroEur: 2500 };
  const parse = (domains) => parseDomainCapacities({ schemaVersion: 1, domains });
  assert.throws(() => parseDomainCapacities({ domains: [] }), /Formato/);
  assert.throws(() => parse([{ ...good, requestsPerMinute: -1 }]), /non validi/);
  assert.throws(() => parse([{ ...good, maxRequestBytes: 1.5 }]), /non validi/);
  assert.throws(() => parse([{ ...good, costPerCallMicroEur: "100" }]), /non validi/);
  assert.throws(() => parse([good, good]), /duplicati/);
  assert.deepEqual(parse([{ ...good, costPerCallMicroEur: 0 }])[0].costPerCallMicroEur, 0);
});
