# Pipeline

Stages: queued, planning, coding, reviewing, done, failed.
Planner produces `plan.json`: steps, files, API contracts, SQL notes.
Coder consumes one plan step and emits `diff.patch`.
Reviewer consumes diff and emits `review.json`: APPROVE or REQUEST_CHANGES.
Max iterations come from `PIPELINE_MAX_ITERATIONS` (default 5).
Timeout per step comes from `PROCESS_TIMEOUT_MS` (default 30000).
Every transition calls `createPipelineLogger` methods.
Every event appends JSONL to `artifacts/pipelines/<id>/audit.log`.
Frontend changes target Next.js routes, components, data fetching.
Backend changes target FastAPI routers, services, Pydantic models.
DB changes require explicit migration SQL, never silent alters.
Failure path writes error to audit log and marks run failed.
Retry resumes from last non-approved step with reviewer feedback.
Done path requires reviewer APPROVE plus passing typecheck/tests.
Run layout: plan.json, diff.patch, review.json, audit.log per id.
