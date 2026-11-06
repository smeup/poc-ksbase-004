export type DomainCapacity = {
  domainId: string;
  requestsPerMinute: number;
  maxRequestBytes: number;
  costPerCallMicroEur: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

export function parseDomainCapacities(value: unknown): DomainCapacity[] {
  if (!isRecord(value) || value.schemaVersion !== 1 || !Array.isArray(value.domains)) {
    throw new Error("Formato dei dati capacità e limiti non valido.");
  }
  const domainIds = new Set<string>();
  return value.domains.map((domain: unknown) => {
    if (
      !isRecord(domain) ||
      typeof domain.domainId !== "string" || !domain.domainId.trim() ||
      !isNonNegativeInteger(domain.requestsPerMinute) ||
      !isNonNegativeInteger(domain.maxRequestBytes) ||
      !isNonNegativeInteger(domain.costPerCallMicroEur)
    ) {
      throw new Error("Dati capacità e limiti non validi.");
    }
    if (domainIds.has(domain.domainId)) {
      throw new Error(`Capacità e limiti duplicati per il dominio ${domain.domainId}.`);
    }
    domainIds.add(domain.domainId);
    return {
      domainId: domain.domainId,
      requestsPerMinute: domain.requestsPerMinute,
      maxRequestBytes: domain.maxRequestBytes,
      costPerCallMicroEur: domain.costPerCallMicroEur,
    };
  });
}
