# QA feedback

## Purpose

This document is the shared loop between QA and implementation agents.
Goal: improve New Browser behaviour to match Comet browser quality (including perplexity quality).

## Loop protocol

1. QA tester runs Playwright flows.
2. QA tester updates only the relevant section below with reproducible evidence.
3. Backend agent reads the **Backend** section, implements fixes, and writes a response in **Backend agent update**.
4. QA tester re-runs the listed checks in **What QA should test next**.
5. Repeat until all open backend issues are closed.

---

## Frontend

### QA findings

- Iteration: `QA-1`
- Date observed: `2026-03-03`
- Environment: `local / Playwright Chromium extension session`
- Checked docs before testing:
  - `docs/ui/frontend/design-rules.md`
  - `docs/architecture.md`
  - `docs/architecture/infrastructure-map.md`
- Reused existing patterns:
  - Existing panel shell, composer lane, and status strip layout in `extension/panel.html` + `extension/styles.css`
  - Existing settings card structure in `extension/options.html` + `extension/options.css`

#### FE-001

- Severity: `Medium`
- Status: `Closed`
- Surface: `panel disconnected/empty state`
- Expected result: when the panel is disconnected, the next recovery action should be obvious at first glance.
- Actual result: `Reconnect to sidecar` CTA is visible in the empty state when disconnected, and reconnects successfully when the sidecar becomes available.
- Reproduction steps:
  1. Launch extension in Playwright persistent Chromium context.
  2. Open `chrome-extension://<id>/panel.html` without sidecar running.
  3. Confirm `Reconnect to sidecar` CTA is visible (no hunting for icon-only controls).
  4. Start sidecar, click `Reconnect to sidecar`, confirm status clears (connected).
- Evidence:
  - Screenshot (offline CTA visible): `output/playwright/qa-panel-disconnected-1772557079708.png`
  - Screenshot (offline click status change): `output/playwright/qa-panel-disconnected-click-1772557079708.png`
  - Screenshot (offline -> sidecar online, before click): `output/playwright/qa-panel-reconnect-offline2-1772557305946.png`
  - Screenshot (after click, status cleared): `output/playwright/qa-panel-reconnect-online2-1772557305946.png`
  - Console/network error: `none captured (status text used as the signal)`
- Notes (premium criteria): CTA is placed in the primary empty-state hierarchy, preserves spacing and calm visual language, and makes the next action obvious at a glance without adding visual noise.

#### FE-002

- Severity: `Low`
- Status: `Closed`
- Surface: `settings information architecture`
- Expected result: settings sections should remain clear and predictable.
- Actual result: cards and controls are consistently grouped; save/clear actions are located predictably.
- Reproduction steps:
  1. Launch extension in Playwright persistent Chromium context.
  2. Open `chrome-extension://<id>/options.html`.
  3. Validate heading, section grouping, and control positioning.
- Evidence:
  - Screenshot: `output/playwright/qa-options-2026-03-03T16-49-03-651Z.png`
  - Console/network error: `not captured in this pass`
- Notes: no blocking visual or usability defects observed in settings view.

#### FE-003

- Severity: `Medium`
- Status: `Open`
- Surface: `slash palette keyboard navigation`
- Expected result: slash palette supports keyboard navigation with `ArrowUp`, `ArrowDown`, `Enter`, and `Escape` (per `TEST_PLAN.md`).
- Actual result: `Enter` submits the prompt (clearing the composer) instead of selecting a slash menu item; `ArrowDown` does not move a selection inside the slash palette.
- Reproduction steps:
  1. Open the panel with no provider API key configured.
  2. Focus the composer and type `/` to open the slash palette.
  3. Press `ArrowDown`, then `Enter`.
  4. Observe the prompt is submitted (composer clears) and an error card appears, rather than a slash selection being applied.
- Evidence:
  - Screenshot: `output/playwright/qa-keyboard-slash-1772557874067.png`
- Notes (premium criteria): keyboard-first operation is a core “premium” signifier; current behaviour feels surprising and slows down power users.

### Frontend agent update

#### Iteration 2 (Agent 2 implementation)

- Iteration: `2`
- Date: `2026-03-03`
- Issues addressed: `FE-001`
- What changed:
  - File(s): `apps/browseros-assistant-ext/source-extension/panel.html`, `apps/browseros-assistant-ext/source-extension/panel.js`, `apps/browseros-assistant-ext/source-extension/styles.css`
  - Summary:
    - Added explicit empty-state CTA button: `Reconnect to sidecar`.
    - Added disconnected-status detection (`Disconnected`, `Sidecar unavailable`, `Event stream interrupted`) to show/hide CTA only when recovery is needed.
    - Wired CTA click to real reconnect flow: `rpc.reconnect()`, EventSource reset, active-tab sync refresh.
    - Styled CTA to remain clear and premium in both default and light themes.
- Verification proof:
  - Commands run:
    1. `npm run build:extension`
    2. `npx vitest run tests/extension/panel-ui-ux.spec.ts tests/surfaces/removal.spec.ts tests/extension/panel-shell.spec.ts`
    3. `npm run pipeline`
    4. `node --input-type=module <<'EOF' ... EOF` (Playwright persistent extension screenshot capture)
  - Result: `Pass`
  - Not run:
    - Manual human click-through in headed browser session (automated screenshot + automated suites used instead).
- Visual validation proof:
  - Screenshot: `output/playwright/qa-panel-disconnected-1772556884818.png`
  - Assessment: reconnect action is now immediately visible in the primary empty-state hierarchy, centred below the brand lockup; control positioning remains consistent and the composer lane stays stable.
- What QA should test next:
  1. Reproduce FE-001 flow exactly: open panel with sidecar offline and confirm `Reconnect to sidecar` appears without hunting for icon controls.
  2. Click `Reconnect to sidecar` with sidecar still offline, then with sidecar online; confirm status transitions from reconnect attempt to connected state.
  3. Re-run `npm run test:funnels` and confirm transcript funnels remain green after reconnect-CTA changes.

#### QA retest notes (QA-2)

- Date: `2026-03-03`
- Result: FE-001 passed end-to-end (offline visibility + offline->online reconnection cleared status).
- Caveat: using `npm start` during this specific Playwright flow can be flaky on macOS because `scripts/start-sidecar.mjs` runs `pkill -x Chromium`; for reliable retest, start the server with `npx --yes tsx sidecar/src/server.ts` instead.

#### Iteration 3 (Agent 2 hardening + visual parity check)

- Iteration: `3`
- Date: `2026-03-03`
- Issues addressed: `FE-001 (hardening)`
- What changed:
  - File(s): `tests/extension/panel-ui-ux.spec.ts`
  - Summary:
    - Added regression assertions for reconnect CTA presence and reconnect logic in panel script (`RECONNECT_STATUS_PATTERNS`, CTA renderer, reconnect handler, `rpc.reconnect()` call).
- Verification proof:
  - Commands run:
    1. `npm run build:extension && npx vitest run tests/extension/panel-ui-ux.spec.ts tests/surfaces/removal.spec.ts tests/extension/panel-shell.spec.ts`
    2. `npm run pipeline`
    3. `node --input-type=module <<'EOF' ... EOF` (connected-state Playwright persistent extension screenshot capture with sidecar stub)
  - Result: `Pass`
  - Not run:
    - Manual headed-browser click test.
- Visual validation proof:
  - Disconnected screenshot: `output/playwright/qa-panel-disconnected-1772556884818.png`
  - Connected screenshot: `output/playwright/qa-panel-connected-1772557129031.png`
  - Assessment: CTA appears only in disconnected state and is hidden when connected; layout hierarchy, positioning, and control lanes remain stable.
- What QA should test next:
  1. Verify disconnected screenshot behaviour matches live panel state (`Reconnect to sidecar` visible).
  2. Verify connected state hides reconnect CTA.
  3. Re-run `npm run pipeline` before closing FE-001.

#### Iteration 4 (Agent 2 reconnect UX polish + flow proof)

- Iteration: `4`
- Date: `2026-03-03`
- Issues addressed: `FE-001 (recovery clarity polish)`
- What changed:
  - File(s): `apps/browseros-assistant-ext/source-extension/panel.js`, `apps/browseros-assistant-ext/source-extension/styles.css`, `tests/extension/panel-ui-ux.spec.ts`
  - Summary:
    - Added explicit offline helper copy in empty state: `Sidecar offline. Start local dev, then reconnect.`
    - Added reconnect button busy state (`Reconnecting...`, disabled + `aria-busy`) during reconnect attempts.
    - Added reconnect-state test assertions so CTA copy and reconnect logic cannot silently regress.
- Verification proof:
  - Commands run:
    1. `npm run build:extension && npx vitest run tests/extension/panel-ui-ux.spec.ts tests/surfaces/removal.spec.ts tests/extension/panel-shell.spec.ts`
    2. `node --input-type=module <<'EOF' ... EOF` (offline→online reconnect simulation in Playwright persistent extension context)
    3. `npm run pipeline`
  - Result: `Pass`
  - Not run:
    - Manual headed-browser click validation by QA operator.
- Visual validation proof:
  - Offline screenshot: `output/playwright/qa-panel-offline-rich-1772557426548.png`
  - Online screenshot: `output/playwright/qa-panel-online-rich-1772557426548.png`
  - Assessment: offline state now communicates exact recovery action and sequence; online state cleanly restores default copy with no reconnect CTA.
- What QA should test next:
  1. In offline mode, confirm empty copy reads exactly `Sidecar offline. Start local dev, then reconnect.` and CTA is visible.
  2. Click CTA and confirm temporary busy state (`Reconnecting...`) before connected recovery.
  3. After sidecar connection recovers, confirm empty copy returns to `Ready when you are.` and CTA disappears.
  4. Re-run `npm run pipeline` and keep FE-001 as `Closed` only if all of the above pass.

---

## Backend

### QA findings

- Iteration: `QA-1`
- Date observed: `2026-03-03`
- Environment: `local dev / branch`
- Checked docs before testing:
  - `docs/architecture/infrastructure-map.md`
  - `docs/runbooks/local-development.md`
  - `docs/troubleshooting.md`
  - `docs/architecture.md`
- Reused existing flows:
  - Canonical funnel verification flow via `npm run test:funnels`
  - Focused backend contract sweep from runbook

#### BE-001

- Severity: `Low`
- Status: `Closed`
- Funnel or test: `Comet transcript browser funnels > runs the transcript funnels through the real extension panel UI`
- User prompt used:
  1. `Please find important unanswered emails from this inbox.`
  2. `Please unsubscribe me from anything that looks like spam or is not important.`
  3. `Please give me ideas to increase the conversion rate on this page and raise average order value.`
  4. `Please tell me what I was doing in these tabs and suggest which ones I should close.`
- Expected result: deterministic final answers align with transcript funnel expectations for Comet-style behaviour.
- Actual result: all funnel assertions passed in Playwright; no backend regression detected in this pass.
- Reproduction steps:
  1. Run `npm run test:funnels`.
  2. Confirm `tests/playwright/funnels/comet-transcript-funnels.spec.ts` passes.
- Evidence:
  - Log: all 2 tests passed in `tests/playwright/funnels/comet-transcript-funnels.spec.ts`
  - Console/network error: `none observed in test output`
- Notes: this is a pass-state record to baseline parity checks.

#### BE-002

- Severity: `Low`
- Status: `Closed`
- Funnel or test: `full regression sweep`
- Expected result: full suite remains green after UI reconnect + shortcut changes.
- Actual result: all automated suites were green in this QA pass.
- Reproduction steps:
  1. Run `npm run test:unit`.
  2. Run `npm run test:integration`.
  3. Run `npm run test:extension`.
  4. Run `npm run test`.
  5. Run `npm run test:funnels`.
- Evidence:
  - Logs: `npm run test` reported `Test Files 61 passed`, `Tests 245 passed`
  - Logs: `npm run test:extension` reported `Test Files 13 passed`, `Tests 30 passed`
  - Logs: `npm run test:funnels` reported `Test Files 1 passed`, `Tests 2 passed`
- Notes: keeping this as a pass-state record to anchor future regressions to repo-defined coverage.

### Backend agent update

#### Iteration 1 (QA baseline handoff to Agent 2)

- Iteration: `1`
- Date: `2026-03-03`
- Issues addressed: `BE-001 (baseline parity pass)`
- What changed:
  - File(s): `none (QA-only iteration)`
  - Summary: established pass/fail baseline and captured frontend evidence for follow-up.
- Verification proof:
  - Commands run:
    1. `command -v npx && node --version && npm --version`
    2. `npx playwright --version`
    3. `npm run test:funnels`
    4. `npx vitest run tests/transport.parsers.spec.ts tests/agent/orchestrator.spec.ts tests/policy/response-validator.spec.ts`
    5. `npm run test:e2e`
    6. `node --input-type=module <<'EOF' ... EOF` (Playwright persistent extension screenshot capture)
  - Result: `Pass`
  - Not run:
    - Live external web prompt runs against real providers (BYOK credentials not provided in this QA pass)
- Risks or follow-ups:
  - Frontend disconnected-state discoverability (FE-001) is still open.
- What QA should test next:
  1. Re-run the disconnected-state manual Playwright check after Agent 2 adds an explicit reconnect CTA.
  2. Re-run `npm run test:funnels` after any backend prompt-policy or orchestration change.
  3. Pass signal: reconnect action is obvious in-panel and funnel suite remains fully green.

#### Iteration 2 (Agent 2 regression sweep)

- Iteration: `2`
- Date: `2026-03-03`
- Issues addressed: `BE-001 (regression guard recheck)`
- What changed:
  - File(s): `none in sidecar/shared/backend runtime`
  - Summary: reran full backend + funnel verification after panel/manifest contract fixes to ensure no regressions in orchestration or funnel outputs.
- Verification proof:
  - Commands run:
    1. `npm run build:extension`
    2. `npm run pipeline`
  - Result: `Pass`
  - Not run:
    - Live provider-backed prompts requiring BYOK keys.
- Risks or follow-ups:
  - No backend blockers observed in this iteration; keep monitoring funnel determinism after each UI/prompt-policy change.
- What QA should test next:
  1. `npm run test:funnels`
  2. Prompts: use the same four transcript prompts listed in `BE-001`.
  3. Expected pass signal: all funnel pass strings remain unchanged and visible in panel thread assertions.

#### QA funnel retest notes (QA-2)

- Date: `2026-03-03`
- Command: `npm run test:funnels`
- Result: `Pass` (2/2 tests) after reconnect-CTA changes.

#### Iteration 3 (Agent 2 backend guard after FE hardening)

- Iteration: `3`
- Date: `2026-03-03`
- Issues addressed: `BE-001 (post-hardening guard)`
- What changed:
  - File(s): `none in sidecar/shared/backend runtime`
  - Summary: re-ran full pipeline after FE reconnect-CTA test hardening to confirm no backend/funnel regressions.
- Verification proof:
  - Commands run:
    1. `npm run pipeline`
  - Result: `Pass`
  - Not run:
    - Live key-backed provider runs.
- Risks or follow-ups:
  - None new.
- What QA should test next:
  1. `npm run test:funnels`
  2. Confirm all four expected transcript answers still match exactly.
  3. If all pass with FE reconnect checks, keep backend parity status as no blockers.

#### Iteration 4 (Agent 2 backend guard after reconnect UX polish)

- Iteration: `4`
- Date: `2026-03-03`
- Issues addressed: `BE-001 (post-polish regression guard)`
- What changed:
  - File(s): `none in backend runtime`
  - Summary: reran full suite after reconnect UX copy/state changes to confirm no impact on orchestration, policy, or funnel determinism.
- Verification proof:
  - Commands run:
    1. `npm run pipeline`
  - Result: `Pass`
  - Not run:
    - Live BYOK provider runs.
- Risks or follow-ups:
  - No backend regressions observed.
- What QA should test next:
  1. `npm run test:funnels`
  2. Confirm expected answer strings remain exact for all four transcript prompts.
  3. If unchanged, keep backend parity tracker as no blockers/regressions.

---

## Comet parity tracker (backend-relevant)

- Current backend blockers to Comet parity: `none observed in QA-1 and Agent 2 Iterations 2-4 verification`
- Known perplexity-quality regressions: `none observed in funnel suite after Agent 2 Iteration 4`
- Last updated: `2026-03-03 (Agent 2 Iteration 4)`

---

## Lessons learned: the-internet crash-course (2026-03-06)

### Context

This pass used the real headed Chromium profile, the actual `extension/` side panel, and human-style prompts against `https://the-internet.herokuapp.com`. The goal was not synthetic Playwright parity or search quality; it was end-to-end browser-task completion with DOM-verified outcomes.

### Failure timeline and fix chain

| Stage | Human prompt / scenario | Observed failure | Root cause | Fix | Regression guard |
| --- | --- | --- | --- | --- | --- |
| 1 | `Checkboxes` | `read_page` returned no useful interactables | `DOMSnapshot.frameId` was interpreted as a frame id instead of a string-table index | Fixed snapshot indexing in `src/sidecar/read-page/snapshot-index.ts` | `tests/read-page/read-page.spec.ts` |
| 2 | `Checkboxes` | model-emitted `computer` steps were rejected | parser expected narrower payload shapes than the model actually emits (`action`, `steps`, `ref_id`) | Relaxed parsing in `shared/src/transport.ts` and dispatcher paths | `tests/transport.parsers.spec.ts`, `tests/rpc/browser-action-dispatcher.spec.ts` |
| 3 | `Checkboxes` | `read_page` rejected `filter: "checkbox"` | dispatcher contract was too narrow | Accepted checkbox filter in `sidecar/src/rpc/read-page-dispatcher.ts` | `tests/rpc/read-page-dispatcher.spec.ts` |
| 4 | crash-course rerun | run died after `navigate` + `read_page` with empty provider turn | provider path could return no assistant text/tool calls | Added bounded retry in `sidecar/src/agent/orchestrator.ts` | `tests/agent/orchestrator.spec.ts` |
| 5 | post-restart panel use | panel/new tabs were not attached consistently | session registration after startup was incomplete and duplicate attach races existed | Fixed auto-registration/deduping in `src/cdp/target-event-router.ts` and `src/cdp/session-registry.ts` | `tests/cdp/target-event-router.spec.ts`, `tests/cdp/session-registry.spec.ts` |
| 6 | screenshot/file-upload flow | Gemini multimodal tool results failed | `[text, image]` tool payloads were serialized incorrectly for Google function responses | Fixed Google multimodal tool serialization in `sidecar/src/llm/google.ts` | `tests/llm/google.spec.ts` |
| 7 | post-restart live QA | Playwright `connectOverCDP` became unreliable | harness depended on a flaky browser attach path | Replaced it with raw-CDP runner in `scripts/live-cdp-panel-check.mjs` | live runner reused for every later crash-course pass |
| 8 | `Checkboxes` rerun | agent solved the wrong site by searching elsewhere | current-site tasks still had `search_web` available | Suppressed web search for current-tab interactive work in `sidecar/src/agent/orchestrator.ts` | `tests/agent/orchestrator.spec.ts` |
| 9 | `Inputs` | agent changed the field but could not confirm the final value | `form_input` only returned `updated: N`, not read-back values | Added confirmation payload in `src/cdp/browser-actions.ts` / `shared/src/transport.ts` | `tests/cdp/browser-actions.spec.ts`, `tests/rpc/browser-action-dispatcher.spec.ts` |
| 10 | Gemini alias experiments | `gemini-flash-latest` / `gemini-3-flash-preview` were not reliable defaults | live Google path rejected some aliases/previews with `HTTP 400` | Recorded failed live validation and later removed the consistently bad browser-control variants from the visible Google catalog | browser-control benchmark evidence below |
| 11 | cumulative benchmark runner | runner initially hit stale browser websocket IDs and later leaked load timeouts | helper assumed a fixed CDP browser websocket and did not fully contain navigation timeout failures | Resolved live websocket dynamically and hardened navigation timeout handling in `scripts/live-cdp-panel-check.mjs` / `scripts/lib/live-cdp-config.js` | verified by rerunning the full course from step 1 |

### Patterns that caused collateral breakage

`Tool contract drift`
- Model-emitted payloads were broader than our parser assumptions. Tool parsing is a compatibility surface, not just an internal type.
- Fixes that only “make one payload pass” are fragile; parsers must tolerate the shapes the live model actually emits.

`Session and run lifecycle coupling`
- Startup, target attach, panel registration, and new-chat reset all affect correctness.
- A tool fix is not enough if the active tab, panel tab, or run state is stale.

`Prompt locality vs. tool availability`
- If `search_web` remains available during local interactive tasks, the model can leave the active site and still look superficially successful.
- For browser-control funnels, locality has to be enforced in orchestration, not requested politely in prompt text.

`Provider-specific serialization assumptions`
- Google/Gemini is sensitive to exact tool/result payload shapes.
- Empty-turn handling and multimodal function responses can fail independently of browser correctness.

`Observability and harness blind spots`
- Shared trace buckets, stale CDP websocket URLs, and flaky attach paths make real product failures look like random model flakiness.
- The harness must be trustworthy before model comparisons mean anything.
- Backend runs can complete correctly while the panel stays stuck in `running` if it misses the terminal SSE event; the panel now needs `AgentGetState` reconciliation, not blind trust in one transport.

### Anti-regression playbook

- Reproduce the issue in the real panel before fixing it.
- After every fix, rerun the same human prompt.
- After every fix batch, rerun the full course from scenario 1 through scenario 6.
- Verify page DOM/state separately from the assistant text.
- Add one focused regression test for each parser/runtime/provider bug.
- After startup/session/registry changes, do a full browser restart pass.
- For current-page tasks, verify the model stays on the active site.
- For form interactions, make tool results explicit enough that the model can answer without guessing.
- Do not leave the live profile on an unverified model setting.

### Human-prompt lessons

- If the browser is already on the page, `On this page...` and `On this site...` phrasing is more reliable than `Open X...`.
- Ask for an explicit end state, not just an action.
- Separate discovery prompts from exercise-completion prompts.
- `Inputs` was the clearest example: `Open Inputs...` produced a weaker plan, while `Set the number field on this page to 42 and tell me the final value.` completed correctly when the model/runtime were healthy.

### Open risks and follow-ups

- Per-run trace bucketing still needs a dedicated diagnostics cleanup so unrelated prompts cannot collapse into the same trace story.
- Repo-wide `vitest`/typecheck signals became unreliable later in this pass, so focused test reruns were not re-confirmed after the final harness tweaks.
- The launcher path (`scripts/start-sidecar.mjs`) is still less trustworthy than the direct browser + direct sidecar path used for the benchmark.
- Build a one-button model approval flow: add model in Settings -> run browser-task benchmark -> mark approved/experimental/blocked -> update browser-task auto-selection policy from stored benchmark results instead of hardcoded lists.

### Gemini browser-control benchmark

- Benchmark scope: `Checkboxes`, `Dropdown`, `Dynamic Controls`, `JavaScript Prompt`, `Inputs`, `File Upload`
- Search intentionally excluded from scoring.
- Visible Google models added to the selectable catalog include:
  - `models/gemini-flash-latest`
  - `models/gemini-2.5-flash`
  - `models/gemini-2.5-pro`
  - `models/gemini-3-pro-preview`
  - `models/gemini-3.1-pro-preview`
  - `models/gemini-2.5-flash-image`
- Browser benchmark exclusion: `models/gemini-2.5-flash-image`
- Removed from the visible Google catalog after failed browser-control validation:
  - `models/gemini-flash-lite-latest`
  - `models/gemini-2.5-flash-lite`
  - `models/gemini-3-flash-preview`
  - `models/gemini-3.1-flash-lite-preview`

#### Live results summary

| Model | Cost tier | Passes | Hard failures | Pattern | Verdict |
| --- | --- | --- | --- | --- | --- |
| `models/gemini-2.5-flash` | `low` | `6/6` | `0` | passed the full live funnel after panel-side terminal-state reconciliation; strong enough to remain the baseline and current default | recommended current Google browser-control default |
| `models/gemini-flash-latest` | `low` | `5/6` observed | `0` observed | handled the core flows, but asked for confirmation instead of completing `File Upload`; answer wording was also less precise on some simple steps | capable, but weaker fit-for-purpose than `gemini-2.5-flash` |
| `models/gemini-flash-lite-latest` | `lowest` | `4/6` observed | `1` observed | cheap and fast on simple flows, but failed `JavaScript Prompt` with repeated invalid tool usage and was already struggling on upload follow-up | too brittle for default browser control |
| `models/gemini-2.5-flash-lite` | `lowest` | `2/6` observed | `0` observed | produced a false-success on `Dynamic Controls` by claiming the checkbox was removed when the DOM still showed it present | disqualified despite lower cost |

- Full green baseline artifact: `output/playwright/live-gemini-browser-course-20260306-panel-reconcile/summary.json`
- Focused comparative artifacts:
  - `output/playwright/live-gemini-browser-course-20260306-panel-reconcile-benchmark/gemini-flash-latest/`
  - `output/playwright/live-gemini-browser-course-20260306-2_5-flash-lite/summary.json`
- Older pre-reconciliation benchmark artifacts remain useful as historical evidence, but the recommendation should follow the post-reconciliation live course above.

#### Current recommendation

- Keep `models/gemini-2.5-flash` as the safe Google browser-task default for now.
- Do not promote `flash-lite` variants for browser control until they stop producing false-successes and invalid tool loops on stateful tasks.
- Do not promote alias/preview models just because they are newer; they must finish the whole funnel without confirmation detours or browser-task regressions.
- Keep removed models out of the visible Google catalog and browser-task auto selection; if we ever want to re-test them, that should be a deliberate code/catalog change, not an accidental sync or stale local setting.
