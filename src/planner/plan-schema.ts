export interface PlanResult {
  prompt: string;
  plan: string;
  plannedAt: string;
}

export function validatePlanShape(value: unknown): value is PlanResult {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.prompt === "string" &&
    typeof record.plan === "string" &&
    typeof record.plannedAt === "string"
  );
}
