export type PackageEntity = {
  id: string;
  description: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function validatePackageEntities(packageId: string, value: unknown): void {
  if (!Array.isArray(value)) {
    throw new Error(`Elenco entità non valido per il package ${packageId}.`);
  }
  const ids = new Set<string>();
  const entities: unknown[] = value;
  for (const entity of entities) {
    if (
      !isRecord(entity) ||
      typeof entity.id !== "string" || !entity.id.trim() ||
      typeof entity.description !== "string" || !entity.description.trim()
    ) {
      throw new Error(`Entità non valida per il package ${packageId}.`);
    }
    if (ids.has(entity.id)) {
      throw new Error(`Entità ${entity.id} duplicata nel package ${packageId}.`);
    }
    ids.add(entity.id);
  }
}

export function collectPackageEntities<T extends { id: string; entities: PackageEntity[] }>(
  packages: T[],
): { pkg: T; entity: PackageEntity }[] {
  return packages.flatMap((pkg) => pkg.entities.map((entity) => ({ pkg, entity })));
}
