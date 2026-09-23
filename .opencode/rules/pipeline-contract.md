# Pipeline Contract

States: queued -> planning -> coding -> reviewing -> done | failed.
Each transition calls pipeline-logger and appends an audit event.
Coder output must include touched files, API changes, SQL migrations.
Reviewer returns APPROVE or REQUEST_CHANGES; max iterations from PIPELINE_MAX_ITERATIONS.
Artifacts per run: plan.json, diff.patch, review.json, audit.log.
