export interface PlannerOutput {
  plan: string;
  files: string[];
  tasks: string[];
}

export const PLANNER_STACK = "Next.js (frontend) + FastAPI (backend) + PostgreSQL (database)";

export function buildPlannerPrompt(userRequest: string): string {
  return [
    "You are a senior software planner.",
    `Target stack: ${PLANNER_STACK}.`,
    "User request:",
    userRequest,
    'Produce an implementation plan as a JSON object with the shape { "plan": string, "files": string[], "tasks": string[] }.',
    'The "plan" field must describe concrete steps for the Next.js frontend, the FastAPI backend, and the PostgreSQL schema.',
  ].join("\n");
}

export function parsePlannerOutput(raw: string): PlannerOutput {
  try {
    const parsed = JSON.parse(raw) as Partial<PlannerOutput>;
    return {
      plan: typeof parsed.plan === "string" ? parsed.plan : raw,
      files: Array.isArray(parsed.files)
        ? parsed.files.filter((f): f is string => typeof f === "string")
        : [],
      tasks: Array.isArray(parsed.tasks)
        ? parsed.tasks.filter((t): t is string => typeof t === "string")
        : [],
    };
  } catch {
    return { plan: raw, files: [], tasks: [] };
  }
}
