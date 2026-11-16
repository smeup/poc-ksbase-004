import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (file) => JSON.parse(readFileSync(new URL(`../public/data/${file}.json`, import.meta.url), "utf8"));

test("l'anagrafica packages associa i micro executor previsti", () => {
  const { packages } = read("packages");
  assert.deepEqual(packages.map(({ id, title, microExecutorIds }) => [id, title, microExecutorIds]), [
    ["smeup-es", "Smeup ES", ["me-java-as400proxy", "me-java-h53"]],
    ["holos", "HOLOS", ["me-node-holos"]],
    ["smeup-multipiattaforma", "Smeup Multipiattaforma", ["me-java-rpgle-std"]],
    ["evodoc", "Evodoc", ["me-java-evodoc"]],
    ["archismall", "Archismall", ["me-java-archismall"]],
  ]);
});

test("solo Smeup ES e HOLOS sono installati e i domini configurano solo package installati", () => {
  const { packages } = read("packages");
  assert.ok(packages.every((pkg) => typeof pkg.installed === "boolean"));
  const installed = packages.filter((pkg) => pkg.installed).map((pkg) => pkg.id);
  assert.deepEqual(installed, ["smeup-es", "holos"]);
  for (const domain of read("application-domains").environments) {
    for (const packageId of Object.keys(domain.packageConfigurations)) {
      assert.ok(installed.includes(packageId), `${domain.id}/${packageId}`);
    }
  }
  for (const check of read("package-health").checks) {
    assert.ok(installed.includes(check.packageId), `${check.domainId}/${check.packageId}`);
  }
});

test("micro executor, schemi e servizi sono coerenti con i package", () => {
  const { packages } = read("packages");
  const { microExecutors } = read("micro-executors");
  for (const pkg of packages) {
    for (const id of pkg.microExecutorIds) {
      const microExecutor = microExecutors.find((item) => item.id === id);
      assert.ok(microExecutor, id);
      assert.ok(Object.hasOwn(microExecutor.packageConfigurationSchemas, pkg.id), `${id}/${pkg.id}`);
    }
  }
  for (const microExecutor of microExecutors) {
    for (const packageId of Object.keys(microExecutor.packageConfigurationSchemas)) {
      assert.ok(packages.find((item) => item.id === packageId)?.microExecutorIds.includes(microExecutor.id));
    }
    for (const api of microExecutor.apis) {
      assert.equal(api.microExecutorId, microExecutor.id);
      for (const packageId of api.packageIds) {
        assert.ok(packages.find((item) => item.id === packageId)?.microExecutorIds.includes(microExecutor.id), api.id);
      }
    }
  }
  const text = JSON.stringify({ packages, microExecutors, domains: read("application-domains") });
  assert.ok(!/\bupp/i.test(text));
});
