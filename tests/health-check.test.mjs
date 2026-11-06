import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getDomainHealth, parseHealthChecks } from "../src/health-check.ts";

const read = (file) => JSON.parse(readFileSync(new URL(`../public/data/${file}.json`, import.meta.url), "utf8"));

test("ogni dominio mostra solo le proprie UPP, incluse quelle senza dati", () => {
  const checks = parseHealthChecks({ schemaVersion: 1, checks: [
    { domainId: "a", uppId: "one", status: "healthy" },
    { domainId: "b", uppId: "one", status: "error", reason: "Errore B" },
    { domainId: "a", uppId: "two", status: "error", reason: "Errore A" },
  ] });
  const rows = getDomainHealth("a", [{ id: "one" }, { id: "two" }, { id: "three" }], checks);
  assert.deepEqual(rows.map(({ health }) => health.status), ["healthy", "error", "unknown"]);
  assert.equal(rows[1].health.reason, "Errore A");
  assert.equal(getDomainHealth("b", [{ id: "one" }], checks)[0].health.reason, "Errore B");
});

test("rifiuta stati non validi, errori senza causa e duplicati", () => {
  const parse = (checks) => parseHealthChecks({ schemaVersion: 1, checks });
  const good = { domainId: "a", uppId: "one", status: "healthy" };
  assert.throws(() => parse([{ ...good, status: "invalid" }]), /non valido/);
  assert.throws(() => parse([{ ...good, status: "error", reason: " " }]), /Causa mancante/);
  assert.throws(() => parse([good, good]), /duplicato/);
  assert.throws(() => parseHealthChecks({ checks: [] }), /Formato/);
});

test("i dati mock coprono tutte le UPP dei domini esistenti", () => {
  const checks = parseHealthChecks(read("upp-health"));
  const { environments } = read("application-domains");
  const { upps } = read("upp");
  for (const domain of environments) {
    const active = upps.filter((upp) => upp.standardPlatform || domain.uppIds.includes(upp.id));
    const rows = getDomainHealth(domain.id, active, checks);
    assert.ok(rows.some(({ health }) => health.status === "healthy"), domain.id);
    assert.ok(rows.some(({ health }) => health.status === "error"), domain.id);
    assert.ok(rows.every(({ health }) => health.status !== "unknown"), domain.id);
  }
});
