export function buildAcceptanceCriteria(prompt: string): string[] {
  void prompt;
  return [
    "Build passes: frontend production build succeeds without errors",
    "Typecheck passes: strict TypeScript check reports no errors",
    "API health: backend health endpoint responds successfully",
    "DB health: PostgreSQL connectivity check succeeds",
  ];
}
