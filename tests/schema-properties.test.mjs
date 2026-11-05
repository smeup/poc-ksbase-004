import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getSchemaProperties } from "../src/schema-properties.ts";

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
    for (const [uppId, schema] of Object.entries(executor.uppConfigurationSchemas)) {
      const result = getSchemaProperties(schema);
      assert.ok(result.properties.length > 0, `${executor.id}: ${uppId}`);
      assert.deepEqual(result.unrepresented, [], `${executor.id}: ${uppId}`);
    }
  }
});
