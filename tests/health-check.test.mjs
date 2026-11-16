import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getDomainHealth, parseHealthChecks } from "../src/health-check.ts";

const read = (file) => JSON.parse(readFileSync(new URL(`../public/data/${file}.json`, import.meta.url), "utf8"));

test("ogni dominio mostra solo i propri package, inclusi quelli senza dati", () => {
  const checks = parseHealthChecks({ schemaVersion: 1, checks: [
    { domainId: "a", packageId: "one", status: "healthy" },
    { domainId: "b", packageId: "one", status: "error", reason: "Errore B" },
    { domainId: "a", packageId: "two", status: "error", reason: "Errore A" },
  ] });
  const rows = getDomainHealth("a", [{ id: "one" }, { id: "two" }, { id: "three" }], checks);
  assert.deepEqual(rows.map(({ health }) => health.status), ["healthy", "error", "unknown"]);
  assert.equal(rows[1].health.reason, "Errore A");
  assert.equal(getDomainHealth("b", [{ id: "one" }], checks)[0].health.reason, "Errore B");
});

test("rifiuta stati non validi, errori senza causa e duplicati", () => {
  const parse = (checks) => parseHealthChecks({ schemaVersion: 1, checks });
  const good = { domainId: "a", packageId: "one", status: "healthy" };
  assert.throws(() => parse([{ ...good, status: "invalid" }]), /non valido/);
  assert.throws(() => parse([{ ...good, status: "error", reason: " " }]), /Causa mancante/);
  assert.throws(() => parse([good, good]), /duplicato/);
  assert.throws(() => parseHealthChecks({ checks: [] }), /Formato/);
});

test("i dati mock coprono tutti i package installati dei domini esistenti", () => {
  const checks = parseHealthChecks(read("package-health"));
  const { environments } = read("application-domains");
  const { packages } = read("packages");
  for (const domain of environments) {
    const rows = getDomainHealth(domain.id, packages.filter((pkg) => pkg.installed), checks);
    assert.ok(rows.some(({ health }) => health.status === "healthy"), domain.id);
    assert.ok(rows.some(({ health }) => health.status === "error"), domain.id);
    assert.ok(rows.every(({ health }) => health.status !== "unknown"), domain.id);
  }
});
