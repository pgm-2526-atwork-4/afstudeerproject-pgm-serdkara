# Project Alignment Guardrail

Before starting any implementation-related task (implementation, technical analysis, or code generation), first consult `PROJECT_SPEC.md` and align the work with the project end goal.

## Required behavior
- Read and apply the objectives, constraints, and evaluation criteria from `PROJECT_SPEC.md` before executing the prompt.
- Prioritize decisions that improve:
  - validation accuracy,
  - comparability with human ground truth,
  - scalability of validation workflows.
- Preserve cybersecurity-policy traceability and the judge rubric dimensions (correctness, completeness, consistency, security relevance, traceability).
- If a user request conflicts with `PROJECT_SPEC.md`, explicitly flag the conflict and stop to ask for confirmation before proceeding.

## Response style for project work
- Briefly state how the proposed change supports the project goals in `PROJECT_SPEC.md`.
- Prefer implementations that keep experiments reproducible and auditable.
