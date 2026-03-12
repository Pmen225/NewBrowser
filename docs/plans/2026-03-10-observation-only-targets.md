# Observation-Only Targets Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a separate non-canonical observation-only target list for the user's broader site universe without weakening the canonical benchmark contract.

**Architecture:** Keep the canonical YAML files unchanged. Add one Markdown planning document for observation-only targets and update the automation contract so future agents cannot confuse planned safe-read targets with active benchmark coverage.

**Tech Stack:** Markdown, repository docs

---

### Task 1: Add the observation-only planning doc

**Files:**
- Create: `docs/testing/observation-only-targets.md`

**Step 1: Write the document**

- Add a title and a first paragraph stating the file is non-canonical.
- Add global safety rules for read-only operation.
- Deduplicate and group the user-provided sites into practical categories.
- Preserve exact URLs where the user supplied them.

**Step 2: Verify the document content**

Run: `sed -n '1,260p' docs/testing/observation-only-targets.md`
Expected: clear non-canonical language, grouped sites, and explicit no-write rules.

### Task 2: Update the automation contract

**Files:**
- Modify: `docs/automation-contract.md`

**Step 1: Add the non-canonical planning reference**

- State that `docs/testing/observation-only-targets.md` is a planning document only.
- State that entries there are not active QA/runtime obligations until promoted into `bench/targets.yaml` and `bench/tasks.yaml`.

**Step 2: Verify contract wording**

Run: `sed -n '1,260p' docs/automation-contract.md`
Expected: canonical vs non-canonical distinction is explicit and path names are exact.

### Task 3: Run consistency checks

**Files:**
- Verify only

**Step 1: Re-run path and cross-reference checks**

Run:

```bash
python3 - <<'PY'
from pathlib import Path
import yaml
root = Path('.')
targets = yaml.safe_load((root / 'bench/targets.yaml').read_text())
tasks = yaml.safe_load((root / 'bench/tasks.yaml').read_text())
contract = (root / 'docs/automation-contract.md').read_text()
assert 'docs/testing/observation-only-targets.md' in contract
assert 'bench/targets.yaml' in contract
assert 'bench/tasks.yaml' in contract
task_ids = {task['id'] for task in tasks['tasks']}
for site in targets['sites']:
    for task_id in site['task_ids']:
        assert task_id in task_ids, task_id
print('observation-only-contract-check: PASS')
PY
```

Expected: `observation-only-contract-check: PASS`

**Step 2: Review git status**

Run: `git status --short`
Expected: only the intended doc changes show up for this step.
