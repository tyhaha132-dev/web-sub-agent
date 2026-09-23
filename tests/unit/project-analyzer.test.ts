import { describe, expect, it } from 'vitest';
import { analyzeProject } from '../../src/project/project-analyzer.js';

describe('project-analyzer (happy path)', () => {
  it('analyzes a prompt as Next.js + FastAPI + Postgres', () => {
    const report = analyzeProject('build a todo app');
    expect(report.projectType).toBe('web-app');
    expect(report.frontend).toBe('nextjs');
    expect(report.backend).toBe('fastapi');
    expect(report.database).toBe('postgres');
    expect(report.requirements).toContain('build a todo app');
  });
});
