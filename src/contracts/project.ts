export type ProjectType = "fullstack";

export interface ProjectManifest {
  type: ProjectType;
  framework: {
    frontend: "nextjs";
    backend: "fastapi";
  };
  packageManager: string;
  database: "postgres";
}
