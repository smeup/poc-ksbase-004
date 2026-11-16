export type PackageHealthCheck =
  | { domainId: string; packageId: string; status: "healthy" }
  | { domainId: string; packageId: string; status: "error"; reason: string };

export type PackageHealthStatus =
  | { status: "healthy" }
  | { status: "error"; reason: string }
  | { status: "unknown" };

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function parseHealthChecks(value: unknown): PackageHealthCheck[] {
  if (!isRecord(value) || value.schemaVersion !== 1 || !Array.isArray(value.checks)) {
    throw new Error("Formato dei dati health check non valido.");
  }
  const keys = new Map<string, Set<string>>();
  return value.checks.map((check: unknown) => {
    if (
      !isRecord(check) ||
      typeof check.domainId !== "string" || !check.domainId.trim() ||
      typeof check.packageId !== "string" || !check.packageId.trim() ||
      (check.status !== "healthy" && check.status !== "error")
    ) {
      throw new Error("Health check non valido: dominio, package o stato mancanti.");
    }
    const domainKeys = keys.get(check.domainId) ?? new Set<string>();
    if (domainKeys.has(check.packageId)) {
      throw new Error(`Health check duplicato per ${check.domainId} / ${check.packageId}.`);
    }
    domainKeys.add(check.packageId);
    keys.set(check.domainId, domainKeys);
    if (check.status === "error") {
      if (typeof check.reason !== "string" || !check.reason.trim()) {
        throw new Error(`Causa mancante per ${check.domainId} / ${check.packageId}.`);
      }
      return { domainId: check.domainId, packageId: check.packageId, status: "error", reason: check.reason };
    }
    return { domainId: check.domainId, packageId: check.packageId, status: "healthy" };
  });
}

export function getDomainHealth<T extends { id: string }>(
  domainId: string,
  packages: T[],
  checks: PackageHealthCheck[],
): { pkg: T; health: PackageHealthStatus }[] {
  const domainChecks = new Map(
    checks.filter((check) => check.domainId === domainId).map((check) => [check.packageId, check]),
  );
  return packages.map((pkg) => {
    const check = domainChecks.get(pkg.id);
    return { pkg, health: check ?? { status: "unknown" } };
  });
}
