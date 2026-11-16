import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getConfigurationValue, getSchemaProperties } from "../src/schema-properties.ts";

test("combina le proprietà annidate degli schemi allOf senza duplicarle", () => {
  const result = getSchemaProperties({
    allOf: [
      { properties: { settings: { type: "object", properties: { host: { type: "string", description: "Host" } } } } },
      { properties: { settings: { type: "object", properties: { port: { type: "integer", description: "Porta" } } } } },
    ],
  });
  assert.deepEqual(result.properties.map(({ path, depth, type, description }) => [path, depth, type, description]), [
    ["settings", 0, "object", "Non specificata"],
    ["settings.host", 1, "string", "Host"],
    ["settings.port", 1, "integer", "Porta"],
  ]);
  assert.deepEqual(result.unrepresented, []);
});

test("visualizza elementi degli array, tipi multipli e riferimenti non espansi", () => {
  const result = getSchemaProperties({
    properties: {
      servers: {
        type: "array",
        items: { type: "object", properties: { name: { type: ["string", "null"], description: "Nome" } } },
      },
      other: { $ref: "#/$defs/other" },
    },
  });
  assert.deepEqual(result.properties.map(({ path, depth, type }) => [path, depth, type]), [
    ["servers", 0, "array"],
    ["servers[]", 1, "object"],
    ["servers[].name", 2, "string | null"],
    ["other", 0, "Non specificato"],
  ]);
  assert.deepEqual(result.unrepresented, ["$ref"]);
});

test("segnala gli schemi di proprietà non validi", () => {
  assert.throws(() => getSchemaProperties({ properties: { invalid: "string" } }), /non valido/);
});

test("distingue i percorsi quando un nome contiene punti o parentesi", () => {
  const result = getSchemaProperties({
    properties: {
      "a.b": { type: "string" },
      a: { properties: { b: { type: "number" } } },
      "a[]": { type: "boolean" },
    },
  });
  assert.deepEqual(result.properties.map(({ path }) => path), ['["a.b"]', "a", "a.b", '["a[]"]']);
});

test("mostra tutte le proprietà degli schemi mock attuali", () => {
  const data = JSON.parse(readFileSync(new URL("../public/data/micro-executors.json", import.meta.url), "utf8"));
  for (const executor of data.microExecutors) {
    for (const [packageId, schema] of Object.entries(executor.packageConfigurationSchemas)) {
      const result = getSchemaProperties(schema);
      assert.ok(result.properties.length > 0, `${executor.id}: ${packageId}`);
      assert.deepEqual(result.unrepresented, [], `${executor.id}: ${packageId}`);
    }
  }
});

test("legge i valori configurati seguendo i segmenti delle proprietà", () => {
  const { properties } = getSchemaProperties({
    properties: {
      as400: { type: "object", properties: { host: { type: "string" }, "nome libreria": { type: "string" } } },
      servers: { type: "array", items: { type: "string" } },
    },
  });
  const configuration = { as400: { host: "srv", "nome libreria": "LIB" }, servers: ["a"] };
  const values = Object.fromEntries(properties.map(({ path, segments }) => [path, getConfigurationValue(configuration, segments)]));
  assert.deepEqual(values, {
    as400: configuration.as400,
    "as400.host": "srv",
    'as400["nome libreria"]': "LIB",
    servers: ["a"],
    "servers[]": undefined,
  });
  assert.equal(getConfigurationValue(undefined, ["as400"]), undefined);
  assert.equal(getConfigurationValue({ as400: "x" }, ["as400", "host"]), undefined);
});
