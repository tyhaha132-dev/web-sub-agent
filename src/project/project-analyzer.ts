export interface ProjectAnalysis {
  projectType: "web-app";
  frontend: "nextjs";
  backend: "fastapi";
  database: "postgres";
  requirements: string[];
}

export function analyzeProject(prompt: string): ProjectAnalysis {
  return {
    projectType: "web-app",
    frontend: "nextjs",
    backend: "fastapi",
    database: "postgres",
    requirements: [prompt],
  };
}
