# Automation Contract

## Canonical Paths

These files are the canonical automation contract for site and task coverage in this repository:

- `bench/targets.yaml`
- `bench/tasks.yaml`
- `reports/site-scorecard.md`

This document defines how those files must be used.

## Purpose

`bench/targets.yaml` and `bench/tasks.yaml` are the canonical inputs.
`reports/site-scorecard.md` is the canonical generated output.

The canonical YAML files now carry two kinds of targets:

- `active`
- `planned_observation_only`

Both are canonical awareness inputs.
Only `active` targets claim repo-backed coverage.

If another doc, ad hoc script, or issue comment disagrees with these files, the canonical files win unless they are being updated in the same change with evidence-backed reasoning.

## Why These Files Exist

This repo already had useful QA and benchmark material, but it was split across README sections,
task docs, smoke scripts, funnel specs, and live benchmark runners.

These canonical files exist so future agents can answer five questions quickly and consistently:

1. Which sites or surfaces matter now
2. Which flows matter on each site
3. What success means for each flow
4. Where score reporting belongs
5. Which defects should be prioritized first

They are intentionally narrower than exploratory docs such as `docs/testing/TASK-TEST-SUITE.md`.
That document remains useful for aspirational coverage ideas, but it is not the canonical automation input
unless its tasks are normalized into `bench/targets.yaml` and `bench/tasks.yaml`.

`docs/testing/observation-only-targets.md` remains a supporting reference, but the agents should now rely first on the canonical YAML files for both active and planned observation-only targets.

## Required Agent Behavior

### QA agent

The QA agent must:

1. Read `bench/targets.yaml` first.
2. Read `bench/tasks.yaml` second.
3. Execute or reproduce tasks from those canonical inputs before forming conclusions.
4. Update `reports/site-scorecard.md` using the same site IDs, task IDs, priorities, and failure terminology.
5. Attach or reference real evidence for any pass, fail, regression, or confidence claim.

When a task has `coverage_state: planned_observation_only`, the QA agent must treat it as read-only. The QA outcome is limited to safe observation: open, navigate, read, summarize, and locate controls.

The QA agent must not treat command success alone as proof.
For example, a zero exit code is not enough if the required visible result, DOM state, RPC payload, screenshot, or report artifact does not match the canonical `expected_outcome`.

### Runtime Improvement agent

The Runtime Improvement agent must:

1. Read `bench/targets.yaml` first.
2. Read `bench/tasks.yaml` second.
3. Prioritize work using canonical priority, repeated failure classes, and missing recovery/control coverage.
4. Use `reports/site-scorecard.md` as the current evidence summary, not as the source of task definitions.
5. Preserve stable task IDs and site IDs when fixing or extending coverage unless a deliberate migration is being performed.

The Runtime Improvement agent must not invent a parallel registry in code comments, issue text, or temporary notes.
If a new site or task matters, add it to the canonical YAML files directly.

If a target is `planned_observation_only`, the Runtime Improvement agent may improve safe observation and navigation behavior around it, but must not turn it into a write-capable workflow unless the canonical YAML files are deliberately promoted and the safety rules are updated.

## Evidence Rules

Success must be evidence-backed.
It is not inferred from intent, DOM inspection alone, tool invocation alone, or “it probably worked”.

Use the evidence level on each task:

- `visible-ui-only`: the result must be visible in the UI and must remain read-only
- `visible-ui-plus-artifact`: the result must be visible in the UI and accompanied by a saved artifact such as `report.json` or a screenshot
- `visible-ui-plus-dom-eval`: the visible flow must complete and the verified page end state must match the required DOM evaluation
- `visible-ui-plus-rpc-payload`: the visible flow must complete and the recorded RPC payload or related structured state must match the task contract

Site quality is based on verified outcomes over time, not vibes.
A site stays Gray, Yellow, or Red until evidence moves it.
Planned observation-only targets are expected to remain Blue in the scorecard until they are promoted into active coverage.

## Observation-Only Safety Rules

Any canonical task with `coverage_state: planned_observation_only` is constrained to:

- open
- navigate
- read
- summarize
- identify controls
- explain what the page is showing

It must not:

- send
- submit
- apply
- save
- publish
- delete
- approve
- invite
- activate roles
- change settings
- grant or remove permissions
- create, edit, assign, or close tickets
- send mail or chat messages
- mutate campaigns, budgets, websites, workflows, or documents

## Staleness And Defects

Missing, stale, or internally inconsistent canonical files are themselves defects.

Treat each of the following as a reportable failure:

- a task ID listed in `bench/targets.yaml` that does not exist in `bench/tasks.yaml`
- a task in `bench/tasks.yaml` whose `site_id` does not exist in `bench/targets.yaml`
- a scorecard row that refers to an unknown site or task
- a new recurring QA flow that never gets added to the canonical files
- a renamed flow that silently changes IDs and breaks continuity

Fix the canonical files first or in the same change.

## Update Rules

- Prefer integrating with existing repo structure over creating new registries.
- Add a site only when it is backed by existing runnable coverage, an existing benchmark entrypoint, or a clearly wired next-step workflow already present in the repo.
- Keep IDs stable and obvious.
- If a flow is aspirational rather than currently exercised, keep it out of the canonical registries until the repo has real backing coverage for it.
- When the repo has both local-fixture and public-site variants of a flow, keep both only if both are already exercised for different reasons, as is true for the current browser-course benchmarks.
- Keep risky work portals, admin centers, communication tools, job sites, and marketing tools in `planned_observation_only` until they have explicit safety rules and evidence-backed promotion into active coverage.

## Supporting References

These remain useful secondary references, but they are not the canonical registry:

- `README.md`
- `docs/testing/browser-agent-automation.md`
- `docs/testing/funnels/comet-transcript-funnels.md`
- `docs/testing/TASK-TEST-SUITE.md`
- `docs/testing/observation-only-targets.md`
- `scripts/run-qa-smoke.mjs`
- `scripts/live-local-browser-course.mjs`
- `scripts/live-gemini-browser-course.mjs`

## Minimum Completion Rule

A QA or runtime-improvement change is not complete unless all three conditions are true:

1. The canonical inputs still describe the intended coverage accurately.
2. The canonical output scorecard reflects the latest evidence or explicitly says it has not been refreshed.
3. Any success claim for a site or task is backed by the evidence required in `bench/tasks.yaml`.
