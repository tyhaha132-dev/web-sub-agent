# Agents

Three fixed roles, models pinned in `src/config/models.ts`.
Planner: `opencode/nemotron-3-ultra-free`, decomposes requirements.
Coder: `opencode/muse-spark-1.3-contributor-free`, implements one step.
Reviewer: `opencode/mimo-v2.6-flash-free`, verifies diff and tests.
Planner input: user prompt, repo tree, DB notes.
Planner output: ordered tasks with done criteria and risk flags.
Coder input: single task, file allowlist, API and SQL contract.
Coder output: strict TypeScript or Python diff plus migration if needed.
Reviewer input: diff, plan item, typecheck and test output.
Reviewer output: APPROVE or REQUEST_CHANGES with file/line notes.
Prompts live in `.opencode/agents/planner.md`, `coder.md`, `reviewer.md`.
Binding lives in `.opencode/opencode.jsonc` by agent name to model.
Rules: no role skipping, no cross-role file writes.
Stack focus: Next.js UI, FastAPI API, PostgreSQL schema.
Escalation: reviewer feedback loops back to coder until limit.
Audit: each agent call is logged with pipeline id.
