export type ResourceCategory = "datasource" | "message-broker" | "container";

export type ResourceType = "postgres" | "mongo" | "rabbitmq" | "container";

/** Risorsa aggiuntiva associata direttamente a un package. */
export type PackageResource = {
  name: string;
  type: ResourceType;
  description?: string;
  /** Versione del servizio (datasource e message broker). */
  version?: string;
  /** Immagine da eseguire: obbligatoria per i container generici. */
  image?: string;
};

export const resourceTypes: Record<ResourceType, { label: string; category: ResourceCategory }> = {
  postgres: { label: "PostgreSQL", category: "datasource" },
  mongo: { label: "MongoDB", category: "datasource" },
  rabbitmq: { label: "RabbitMQ", category: "message-broker" },
  container: { label: "Container", category: "container" },
};

/** Ordine di presentazione delle categorie. */
export const resourceCategories: { id: ResourceCategory; label: string }[] = [
  { id: "datasource", label: "Datasource" },
  { id: "message-broker", label: "Message broker" },
  { id: "container", label: "Container generici" },
];

const isNonEmptyString = (value: unknown): value is string => typeof value === "string" && value.trim() !== "";

/** Valida le risorse di un package; `undefined` equivale a nessuna risorsa. */
export function parsePackageResources(packageName: string, value: unknown): PackageResource[] {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw new Error(`Risorse non valide per il package ${packageName}.`);
  }
  const names = new Set<string>();
  for (const resource of value) {
    if (!resource || typeof resource !== "object" || !isNonEmptyString(resource.name)) {
      throw new Error(`Risorsa senza nome nel package ${packageName}.`);
    }
    const { name, type, description, version, image } = resource as Record<string, unknown>;
    if (names.has(name as string)) {
      throw new Error(`Risorsa ${name} duplicata nel package ${packageName}.`);
    }
    names.add(name as string);
    if (typeof type !== "string" || !Object.hasOwn(resourceTypes, type)) {
      throw new Error(`Tipo non valido per la risorsa ${name} nel package ${packageName}.`);
    }
    for (const [field, fieldValue] of Object.entries({ description, version, image })) {
      if (fieldValue !== undefined && typeof fieldValue !== "string") {
        throw new Error(`Campo ${field} non valido per la risorsa ${name} nel package ${packageName}.`);
      }
    }
    if (type === "container" && !isNonEmptyString(image)) {
      throw new Error(`Immagine mancante per il container ${name} nel package ${packageName}.`);
    }
  }
  return value as PackageResource[];
}

/** Raggruppa le risorse per categoria, nell'ordine di `resourceCategories`, omettendo le categorie vuote. */
export function groupResourcesByCategory<T extends { resource: PackageResource }>(items: T[]) {
  return resourceCategories
    .map((category) => ({
      ...category,
      items: items.filter(({ resource }) => resourceTypes[resource.type].category === category.id),
    }))
    .filter((group) => group.items.length > 0);
}
