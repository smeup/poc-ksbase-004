export type UppHealthCheck =
  | { domainId: string; uppId: string; status: "healthy" }
  | { domainId: string; uppId: string; status: "error"; reason: string };

export type UppHealthStatus =
  | { status: "healthy" }
  | { status: "error"; reason: string }
  | { status: "unknown" };

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function parseHealthChecks(value: unknown): UppHealthCheck[] {
  if (!isRecord(value) || value.schemaVersion !== 1 || !Array.isArray(value.checks)) {
    throw new Error("Formato dei dati health check non valido.");
  }
  const keys = new Map<string, Set<string>>();
  return value.checks.map((check: unknown) => {
    if (
      !isRecord(check) ||
      typeof check.domainId !== "string" || !check.domainId.trim() ||
      typeof check.uppId !== "string" || !check.uppId.trim() ||
      (check.status !== "healthy" && check.status !== "error")
    ) {
      throw new Error("Health check non valido: dominio, UPP o stato mancanti.");
    }
    const domainKeys = keys.get(check.domainId) ?? new Set<string>();
    if (domainKeys.has(check.uppId)) {
      throw new Error(`Health check duplicato per ${check.domainId} / ${check.uppId}.`);
    }
    domainKeys.add(check.uppId);
    keys.set(check.domainId, domainKeys);
    if (check.status === "error") {
      if (typeof check.reason !== "string" || !check.reason.trim()) {
        throw new Error(`Causa mancante per ${check.domainId} / ${check.uppId}.`);
      }
      return { domainId: check.domainId, uppId: check.uppId, status: "error", reason: check.reason };
    }
    return { domainId: check.domainId, uppId: check.uppId, status: "healthy" };
  });
}

export function getDomainHealth<T extends { id: string }>(
  domainId: string,
  upps: T[],
  checks: UppHealthCheck[],
): { upp: T; health: UppHealthStatus }[] {
  const domainChecks = new Map(
    checks.filter((check) => check.domainId === domainId).map((check) => [check.uppId, check]),
  );
  return upps.map((upp) => {
    const check = domainChecks.get(upp.id);
    return { upp, health: check ?? { status: "unknown" } };
  });
}
