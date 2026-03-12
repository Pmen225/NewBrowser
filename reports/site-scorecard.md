# NewBrowser Site Scorecard

This is the canonical human-readable score output for the site and task registry.

The registry now has two coverage states:

- `active`: repo-backed coverage with runnable evidence expectations
- `planned_observation_only`: site matters, agents should know about it, but only read-only observation tasks are allowed

## Status Key

- Green: recently verified and passing with matching visible or validated evidence
- Yellow: partially verified, mixed, or aging evidence that needs a fresh run
- Red: currently failing, regressed, or blocked by a reproduced defect
- Gray: canonical active target, but this scorecard has not yet been refreshed with new evidence
- Blue: canonical planned observation-only target; safe-read awareness exists, but no active runtime coverage is claimed

## Active Coverage Summary

| Site ID | Surface | Priority | Tasks | Status | Evidence basis | Notes |
|---|---|---:|---:|---|---|---|
| `assistant-panel` | Extension side panel | P0 | 7 | Gray | Repo inspection only; runnable smoke and funnel coverage exists | Canonical product surface for attachments and control-state UX |
| `local-browser-course` | Local browser-control fixture | P0 | 6 | Yellow | Refreshed 11 March 2026 with `npm run benchmark:browser:local`; 5/6 tasks passed with DOM-verified evidence | Preferred stable browser-course surface; remaining failure is `local-course-file-upload` answer wording mismatch, not runtime execution |
| `the-internet-browser-course` | Public browser-control benchmark | P1 | 6 | Gray | Repo inspection only; live Google benchmark flow exists | Still used by current model approval flow |
| `comet-funnels-fixture` | Local transcript funnel fixtures | P1 | 4 | Gray | Repo inspection only; panel regression suite exists | Product-level panel flows with exact visible-answer expectations |

## Planned Observation-Only Coverage Summary

These targets are canonical so other agents know they matter, but they are strictly read-only by contract.

| Site ID | Surface | Priority | Task ID | Status | Safety mode |
|---|---|---:|---|---|---|
| `microsoft-365-admin-centers` | Microsoft 365 Admin Centers | P0 | `obs-microsoft-365-admin-centers` | Blue | observation-only |
| `sharepoint-admin-center` | SharePoint Admin Center | P0 | `obs-sharepoint-admin-center` | Blue | observation-only |
| `azure-portal` | Azure Portal | P0 | `obs-azure-portal` | Blue | observation-only |
| `servicedesk-health-foundation` | ServiceDesk Health Foundation | P0 | `obs-servicedesk-health-foundation` | Blue | observation-only |
| `kocho-n-able` | Kocho N-able | P0 | `obs-kocho-n-able` | Blue | observation-only |
| `n-able-n-central` | N-able N-Central | P0 | `obs-n-able-n-central` | Blue | observation-only |
| `mimecast-admin` | Mimecast Admin | P0 | `obs-mimecast-admin` | Blue | observation-only |
| `outlook-web` | Outlook Web | P0 | `obs-outlook-web` | Blue | observation-only |
| `microsoft-365-chat` | Microsoft 365 Chat | P0 | `obs-microsoft-365-chat` | Blue | observation-only |
| `microsoft-teams-web` | Microsoft Teams Web | P0 | `obs-microsoft-teams-web` | Blue | observation-only |
| `google-ads` | Google Ads | P0 | `obs-google-ads` | Blue | observation-only |
| `microsoft-ads` | Microsoft Ads Bing Ads | P0 | `obs-microsoft-ads` | Blue | observation-only |
| `excel-online` | Excel Online | P1 | `obs-excel-online` | Blue | observation-only |
| `word-online` | Word Online | P1 | `obs-word-online` | Blue | observation-only |
| `gmail` | Gmail | P1 | `obs-gmail` | Blue | observation-only |
| `notion` | Notion | P1 | `obs-notion` | Blue | observation-only |
| `github` | GitHub | P1 | `obs-github` | Blue | observation-only |
| `google-ai-studio` | Google AI Studio | P1 | `obs-google-ai-studio` | Blue | observation-only |
| `notebooklm` | NotebookLM | P1 | `obs-notebooklm` | Blue | observation-only |
| `wix` | Wix | P1 | `obs-wix` | Blue | observation-only |
| `canva` | Canva | P1 | `obs-canva` | Blue | observation-only |
| `marketing-web-tools` | Marketing Web Tools | P1 | `obs-marketing-web-tools` | Blue | observation-only |
| `n8n` | n8n | P1 | `obs-n8n` | Blue | observation-only |
| `linkedin` | LinkedIn | P1 | `obs-linkedin` | Blue | observation-only |
| `indeed-uk` | Indeed UK | P1 | `obs-indeed-uk` | Blue | observation-only |
| `totaljobs` | Totaljobs | P1 | `obs-totaljobs` | Blue | observation-only |
| `reed` | Reed | P1 | `obs-reed` | Blue | observation-only |
| `cv-library` | CV-Library | P1 | `obs-cv-library` | Blue | observation-only |
| `chatgpt` | ChatGPT | P2 | `obs-chatgpt` | Blue | observation-only |
| `perplexity` | Perplexity | P2 | `obs-perplexity` | Blue | observation-only |
| `grok` | Grok | P2 | `obs-grok` | Blue | observation-only |
| `reddit` | Reddit | P2 | `obs-reddit` | Blue | observation-only |
| `youtube` | YouTube | P2 | `obs-youtube` | Blue | observation-only |
| `twitter-x` | Twitter X | P2 | `obs-twitter-x` | Blue | observation-only |
| `google-search` | Google Search | P2 | `obs-google-search` | Blue | observation-only |
| `pluralsight` | Pluralsight | P2 | `obs-pluralsight` | Blue | observation-only |

## Active Per-Site Detail

### `assistant-panel`

| Task ID | Name | Expected evidence | Last known state |
|---|---|---|---|
| `panel-screenshot-smoke` | Capture visible-tab screenshot from the panel | `report.json`, `panel-final.png`, visible attachment chip | Not yet scored in this file |
| `panel-screenshot-agentrun` | Submit screenshot attachment as image input | visible chip plus AgentRun image payload | Not yet scored in this file |
| `panel-history-followup` | Preserve chat history across follow-up runs | visible chat thread plus second AgentRun history payload | Not yet scored in this file |
| `panel-stop-run` | Stop an in-flight run from the send button | visible stop-to-idle transition plus stopped message | Not yet scored in this file |
| `panel-pause-resume` | Pause from takeover overlay and resume the same run | visible overlay state plus resume payload | Not yet scored in this file |
| `panel-navigation-idle` | Complete a simple navigation run and return to idle | visible completion message plus idle send state | Not yet scored in this file |
| `panel-interrupted-neutral` | Render interrupted runs as neutral interruptions | visible interruption copy and no fatal error slab | Not yet scored in this file |

### `local-browser-course`

| Task ID | Name | Expected evidence | Last known state |
|---|---|---|---|
| `local-course-checkboxes` | Checkboxes final state | visible run plus DOM eval and assistant answer agreement | Pass on 11 March 2026; DOM verified `c1=true`, `c2=false` |
| `local-course-dropdown` | Dropdown selection | visible run plus DOM eval and assistant answer agreement | Pass on 11 March 2026; DOM verified `value="2"` |
| `local-course-dynamic-controls` | Dynamic controls removal and enable flow | visible run plus DOM eval and assistant answer agreement | Pass on 11 March 2026; DOM verified checkbox removed, input enabled, value `Atlas` |
| `local-course-javascript-prompt` | JavaScript prompt handling | visible run plus DOM eval and assistant answer agreement | Pass on 11 March 2026; DOM verified `result="You entered: Atlas"` |
| `local-course-inputs` | Numeric input entry | visible run plus DOM eval and assistant answer agreement | Pass on 11 March 2026; DOM verified `value="42"` |
| `local-course-file-upload` | File upload completion | visible run plus DOM eval and assistant answer agreement | Fail on 11 March 2026; DOM verified upload succeeded but assistant answer said “uploaded successfully” instead of naming `atlas-upload-check.txt` |

### `the-internet-browser-course`

| Task ID | Name | Expected evidence | Last known state |
|---|---|---|---|
| `heroku-course-checkboxes` | Public checkboxes benchmark | visible run plus DOM eval and assistant answer agreement | Not yet scored in this file |
| `heroku-course-dropdown` | Public dropdown benchmark | visible run plus DOM eval and assistant answer agreement | Not yet scored in this file |
| `heroku-course-dynamic-controls` | Public dynamic controls benchmark | visible run plus DOM eval and assistant answer agreement | Not yet scored in this file |
| `heroku-course-javascript-prompt` | Public JavaScript prompt benchmark | visible run plus DOM eval and assistant answer agreement | Not yet scored in this file |
| `heroku-course-inputs` | Public numeric input benchmark | visible run plus DOM eval and assistant answer agreement | Not yet scored in this file |
| `heroku-course-file-upload` | Public file upload benchmark | visible run plus DOM eval and assistant answer agreement | Not yet scored in this file |

### `comet-funnels-fixture`

| Task ID | Name | Expected evidence | Last known state |
|---|---|---|---|
| `funnel-email-triage` | Transcript funnel - email triage | visible exact answer plus funnel screenshot | Not yet scored in this file |
| `funnel-unsubscribe-spam` | Transcript funnel - unsubscribe spam | visible exact answer plus funnel screenshot | Not yet scored in this file |
| `funnel-conversion-audit` | Transcript funnel - conversion audit | visible exact answer plus funnel screenshot | Not yet scored in this file |
| `funnel-tab-recovery` | Transcript funnel - tab recovery | visible exact answer plus funnel screenshot | Not yet scored in this file |

## Dominant Failure Classes

Use these names consistently in scorecard updates and defect notes.

| Failure class | Where it currently shows up | Meaning |
|---|---|---|
| `runtime-failure` | Active flows and planned observation-only checks | The surface does not load or basic execution fails |
| `perception-failure` | Screenshot and observation-only flows | The agent sees the wrong thing or misses the right UI state |
| `validation-failure` | Funnel exact-answer checks | The observed result does not match the required outcome |
| `transport-sync-failure` | Panel payload and control flows | UI state and RPC or event-stream state drift apart |
| `recovery-failure` | Stop, pause, resume, interruption flows | The system does not recover or represent recovery correctly |
| `premature-completion` | Multi-step panel and browser tasks | The run exits before the required end state is achieved |
| `timeout` | Live benchmark scripts and Playwright flows | The task stalls or never reaches the required state in time |
| `dom-mismatch` | Browser-course benchmark scripts | The page end state is wrong even if the assistant answered something plausible |
| `answer-mismatch` | Browser-course benchmark scripts | The assistant answer does not match the verified page state |
| `wrong-site-escape` | Active and planned site checks | The run leaves the intended target page or surface |
| `provider-http-error` | Live provider benchmark scripts | Provider-side or model-side HTTP failure during a live run |
| `runner-error` | Live provider benchmark scripts | Harness or runner failure outside the expected task result |
| `unsafe-write-attempt` | Planned observation-only targets | The agent attempted a forbidden write or account-affecting action |

## Recent Task Coverage

| Command or entrypoint | Canonical task coverage |
|---|---|
| `npm run qa:smoke` | `panel-screenshot-smoke` |
| `npm run qa:regression` / `npm run test:funnels` | `funnel-*`, `panel-screenshot-agentrun`, `panel-history-followup`, `panel-stop-run`, `panel-pause-resume`, `panel-navigation-idle`, `panel-interrupted-neutral` |
| `npm run benchmark:browser:local` | `local-course-*` |
| `scripts/live-gemini-browser-course.mjs` | `heroku-course-*` |
| planned observation-only targets | currently canonical awareness only; no active scheduled runner is claimed yet |

## Open Regressions Or Current Confidence

- This scorecard is only partially refreshed: `local-browser-course` now has fresh benchmark evidence from `npm run benchmark:browser:local` and is Yellow with 5/6 passing tasks, while the other active sites still need a fresh full refresh.
- All planned observation-only targets start Blue by design. Blue means canonical awareness plus strict read-only guardrails, not active support.
- If a planned observation-only target is promoted into active automation later, it must move from Blue into the active tables with evidence-backed tasks and verification.
- If a task or site is added to the canonical YAML files but is missing from this scorecard, treat that mismatch as a defect in the automation contract.
