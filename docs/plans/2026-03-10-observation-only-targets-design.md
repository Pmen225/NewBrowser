# Observation-Only Targets Design

## Objective

Keep the canonical benchmark registry strict and repo-backed while capturing the user's broader real-world site universe in a separate, explicitly non-canonical observation-only document with strong safety rules.

## Problem

The repository now has canonical coverage files:

- `bench/targets.yaml`
- `bench/tasks.yaml`
- `reports/site-scorecard.md`
- `docs/automation-contract.md`

Those files are intended to drive QA and runtime-improvement work. Adding unsupported work portals, admin centers, job sites, and personal productivity sites directly into the canonical registry would mislead future agents into treating them as active tested coverage. That is unsafe, especially for Microsoft 365, Azure, SharePoint admin, service desk, email, marketing, and job-application surfaces.

## Constraints

- Canonical files must remain trustworthy and evidence-backed.
- Work and admin surfaces must be observation-only.
- Observation-only means:
  - allowed: open, navigate, read, summarize, identify controls, describe state
  - forbidden: submit, send, save, apply, publish, delete, invite, approve, create, modify settings, or perform destructive/account-affecting actions
- Duplicate site names from the user list should be normalized into one entry.
- The result should be obvious enough that future agents do not confuse planned read-only coverage with active benchmark coverage.

## Options Considered

### Option 1: Add all sites to the canonical registry as read-only tasks

Pros:
- Everything would be in one place.

Cons:
- Breaks the meaning of "canonical" by mixing current supported coverage with future intent.
- Makes unsafe portals look actively supported.
- High risk of other agents overreaching on work systems.

Decision: reject.

### Option 2: Keep canonical files strict and add a separate planned observation-only registry

Pros:
- Preserves trust in canonical files.
- Captures the user's real-world site list.
- Creates a clean promotion path later from planned to canonical.
- Allows strong safety language for risky portals.

Cons:
- Introduces one extra doc.

Decision: accept.

### Option 3: Ignore the broader site list entirely

Pros:
- No extra files.

Cons:
- Loses important user intent.
- Makes future expansion ad hoc and easy to forget.

Decision: reject.

## Proposed Design

Add a new non-canonical document:

- `docs/testing/observation-only-targets.md`

This document will:

- state clearly that it is not a canonical benchmark input
- define universal no-write guardrails
- group the user's requested sites into practical buckets
- normalize duplicates
- preserve explicit URLs where the user supplied them
- mark work/admin surfaces as highest-risk read-only targets

Update:

- `docs/automation-contract.md`

So it explicitly distinguishes:

- canonical inputs: `bench/targets.yaml`, `bench/tasks.yaml`
- canonical generated output: `reports/site-scorecard.md`
- non-canonical planning input: `docs/testing/observation-only-targets.md`

## Data Model

The new planning doc will stay human-readable Markdown instead of YAML because it is not an automation input yet. Each entry should include:

- site or platform name
- category
- mode: observation-only
- allowed behavior summary
- forbidden behavior summary
- notes or exact URL when provided

## Safety Rules

For work/admin and communication surfaces, future agents must default to:

- navigation only
- read only
- summarize only
- locate controls only

They must not:

- send mail or chat
- submit tickets
- apply for jobs
- change tenant settings
- grant permissions
- activate roles
- publish ads or website changes
- upload files except where explicitly approved in a future task-specific workflow

## Testing

Because this is documentation and contract scaffolding, verification should focus on:

- canonical files remain unchanged in meaning
- contract paths stay correct
- new observation-only doc is explicitly non-canonical
- safety rules are unambiguous

## Expected Outcome

Future agents will have:

- one trusted canonical registry for active repo-backed coverage
- one safe planning document for the user's broader site universe
- explicit guardrails that prevent accidental risky actions on work systems
