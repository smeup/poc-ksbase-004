export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
export type JsonSchema = { [key: string]: JsonValue };

type SchemaNode = JsonSchema | boolean;

export type SchemaProperty = {
  name: string;
  path: string;
  segments: string[];
  depth: number;
  type: string;
  description: string;
};

const unrepresentedKeywords = [
  "$ref", "$dynamicRef", "anyOf", "oneOf", "not", "if", "then", "else",
  "patternProperties", "additionalProperties", "prefixItems", "dependentSchemas",
];

function isObject(value: JsonValue | undefined): value is JsonSchema {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function asSchema(value: JsonValue | undefined): SchemaNode {
  if (typeof value === "boolean" || isObject(value)) {
    return value;
  }
  throw new Error("Schema di proprietà non valido.");
}

function expandAllOf(schemas: SchemaNode[], unrepresented: Set<string>): SchemaNode[] {
  return schemas.flatMap((schema) => {
    if (typeof schema === "boolean") {
      return [schema];
    }
    for (const keyword of unrepresentedKeywords) {
      if (keyword in schema) unrepresented.add(keyword);
    }
    if (schema.allOf === undefined) {
      return [schema];
    }
    if (!Array.isArray(schema.allOf)) {
      throw new Error("Composizione allOf non valida.");
    }
    return [schema, ...expandAllOf(schema.allOf.map(asSchema), unrepresented)];
  });
}

function typeLabel(schema: SchemaNode): string | undefined {
  if (typeof schema === "boolean") return schema ? undefined : "nessun valore";
  if (schema.type === undefined) return undefined;
  if (typeof schema.type === "string") return schema.type;
  if (Array.isArray(schema.type) && schema.type.every((type) => typeof type === "string")) {
    return schema.type.join(" | ");
  }
  throw new Error("Tipo di proprietà non valido.");
}

function propertyPath(parentPath: string, name: string): string {
  if (/^[A-Za-z_$][\w$]*$/.test(name)) {
    return parentPath ? `${parentPath}.${name}` : name;
  }
  return `${parentPath}[${JSON.stringify(name)}]`;
}

export function getSchemaProperties(schema: JsonSchema): {
  properties: SchemaProperty[];
  unrepresented: string[];
} {
  const properties: SchemaProperty[] = [];
  const unrepresented = new Set<string>();

  function addProperty(name: string, path: string, segments: string[], depth: number, fragments: SchemaNode[]) {
    const types = [...new Set(fragments.map(typeLabel).filter((type) => type !== undefined))];
    const descriptions = [...new Set(fragments.flatMap((fragment) =>
      typeof fragment !== "boolean" && typeof fragment.description === "string"
        ? [fragment.description]
        : [],
    ))];
    properties.push({
      name,
      path,
      segments,
      depth,
      type: types.length ? types.join(" & ") : "Non specificato",
      description: descriptions.join(" / ") || "Non specificata",
    });
  }

  function collect(schemas: SchemaNode[], depth: number, parentPath: string, parentSegments: string[]) {
    const expanded = expandAllOf(schemas, unrepresented);
    const children = new Map<string, SchemaNode[]>();
    for (const node of expanded) {
      if (typeof node === "boolean" || node.properties === undefined) continue;
      if (!isObject(node.properties)) throw new Error("Proprietà dello schema non valide.");
      for (const [name, value] of Object.entries(node.properties)) {
        const group = children.get(name) ?? [];
        group.push(asSchema(value));
        children.set(name, group);
      }
    }
    for (const [name, definitions] of children) {
      const fragments = expandAllOf(definitions, unrepresented);
      const path = propertyPath(parentPath, name);
      const segments = [...parentSegments, name];
      addProperty(name, path, segments, depth, fragments);
      collect(definitions, depth + 1, path, segments);
      const items = fragments.flatMap((fragment) =>
        typeof fragment !== "boolean" && fragment.items !== undefined
          ? [asSchema(fragment.items)]
          : [],
      );
      if (items.length) {
        const itemPath = `${path}[]`;
        const itemSegments = [...segments, "[]"];
        addProperty("[]", itemPath, itemSegments, depth + 1, expandAllOf(items, unrepresented));
        collect(items, depth + 2, itemPath, itemSegments);
      }
    }
  }

  collect([schema], 0, "", []);
  return { properties, unrepresented: [...unrepresented] };
}

/**
 * Restituisce il valore configurato per una proprietà dello schema.
 * Gli elementi degli array (`[]`) non hanno un singolo valore: in quel caso
 * restituisce `undefined`, come per le proprietà non configurate.
 */
export function getConfigurationValue(
  configuration: JsonValue | undefined,
  segments: string[],
): JsonValue | undefined {
  let current = configuration;
  for (const segment of segments) {
    if (segment === "[]" || !isObject(current) || !Object.hasOwn(current, segment)) {
      return undefined;
    }
    current = current[segment];
  }
  return current;
}
