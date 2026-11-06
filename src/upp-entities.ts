export type UppEntity = {
  id: string;
  description: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function validateUppEntities(uppId: string, value: unknown): void {
  if (!Array.isArray(value)) {
    throw new Error(`Elenco entità non valido per la UPP ${uppId}.`);
  }
  const ids = new Set<string>();
  const entities: unknown[] = value;
  for (const entity of entities) {
    if (
      !isRecord(entity) ||
      typeof entity.id !== "string" || !entity.id.trim() ||
      typeof entity.description !== "string" || !entity.description.trim()
    ) {
      throw new Error(`Entità non valida per la UPP ${uppId}.`);
    }
    if (ids.has(entity.id)) {
      throw new Error(`Entità ${entity.id} duplicata nella UPP ${uppId}.`);
    }
    ids.add(entity.id);
  }
}

export function collectUppEntities<T extends { id: string; entities: UppEntity[] }>(
  upps: T[],
): { upp: T; entity: UppEntity }[] {
  return upps.flatMap((upp) => upp.entities.map((entity) => ({ upp, entity })));
}
