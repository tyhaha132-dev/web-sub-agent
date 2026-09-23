import type { PlanResult } from "./plan-schema.js";

export interface PlanValidation {
  valid: boolean;
  errors: string[];
}

export interface PlanValidator {
  validate(plan: PlanResult): PlanValidation;
}

export function createPlanValidator(): PlanValidator {
  return {
    validate(plan: PlanResult): PlanValidation {
      const errors: string[] = [];
      if (plan.prompt.trim().length === 0) {
        errors.push("Plan prompt must be a non-empty string");
      }
      if (plan.plan.trim().length === 0) {
        errors.push("Plan content must be a non-empty string");
      }
      if (plan.plannedAt.trim().length === 0) {
        errors.push("Plan plannedAt must be a non-empty string");
      } else if (Number.isNaN(Date.parse(plan.plannedAt))) {
        errors.push("Plan plannedAt must be a valid date-time string");
      }
      return { valid: errors.length === 0, errors };
    },
  };
}
