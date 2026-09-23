export interface ManifestValidation {
  valid: boolean;
  errors: string[];
}

const REQUIRED_FIELDS = ["frontend", "backend", "database"] as const;

export function validateManifest(manifest: unknown): ManifestValidation {
  if (typeof manifest !== "object" || manifest === null) {
    return { valid: false, errors: ["Manifest must be an object"] };
  }
  const record = manifest as Record<string, unknown>;
  const errors: string[] = [];
  for (const field of REQUIRED_FIELDS) {
    const value: unknown = record[field];
    if (typeof value !== "string" || value.trim().length === 0) {
      errors.push(`Manifest field "${field}" must be a non-empty string`);
    }
  }
  return { valid: errors.length === 0, errors };
}
