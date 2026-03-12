# Web Browsing Reset Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a reset-to-defaults flow in Web Browsing settings that restores browsing preferences to their authoritative defaults without touching unrelated user data.

**Architecture:** Reuse the existing settings ownership split instead of inventing a new store: `ui.modelConfig` owns browser-search behaviour and `ui.panelSettings` remains the panel preference store. Add a Web Browsing-scoped reset action in `options.html` and `options.js` that writes defaults back through the same save helpers, updates the live form state immediately, and reports truthful status. Keep the reset scope explicit so future browsing settings can plug into the same primitive safely.

**Tech Stack:** Chrome extension settings UI, vanilla JS, Chrome local storage, Vitest.

---

### Task 1: Lock the reset contract in tests

**Files:**
- Modify: `tests/extension/panel-settings.spec.ts`
- Modify: `tests/options-layout.spec.ts`

**Step 1: Write the failing tests**

Add tests that prove:
- there is a Web Browsing reset control and status region in the HTML contract
- panel settings exposes a reusable way to derive default settings

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/extension/panel-settings.spec.ts tests/options-layout.spec.ts`
Expected: FAIL because the reset contract and defaults helper do not exist yet.

**Step 3: Write minimal implementation**

Add the smallest code needed so those tests can pass without wiring behaviour yet.

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/extension/panel-settings.spec.ts tests/options-layout.spec.ts`
Expected: PASS.

### Task 2: Add the reset UI wiring and authoritative reset behaviour

**Files:**
- Modify: `extension/options.html`
- Modify: `extension/options.js`
- Modify: `extension/lib/panel-settings.js`

**Step 1: Write the failing test**

Add a test that asserts the script contains a Web Browsing reset path which:
- resets browsing controls through authoritative defaults
- updates the existing search toggle
- exposes a truthful status message
- keeps the flow scoped to Web Browsing

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/options-layout.spec.ts`
Expected: FAIL because the script does not yet include the reset handler.

**Step 3: Write minimal implementation**

Implement the reset button, status element, helper functions, and event wiring in the existing settings flow.

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/options-layout.spec.ts tests/extension/panel-settings.spec.ts`
Expected: PASS.

### Task 3: Verify behaviour and document the feature truthfully

**Files:**
- Modify: `docs/plans/2026-03-11-web-browsing-reset-design.md`
- Update issue: `#122`

**Step 1: Run focused verification**

Run: `npx vitest run tests/extension/panel-settings.spec.ts tests/options-layout.spec.ts tests/extension/options-html-integrity.spec.ts tests/extension/settings-pages.spec.ts`
Expected: PASS.

**Step 2: Run visible verification**

Use headed browser automation to open the real settings page, toggle Web search away from default, click Reset to defaults, and confirm the toggle and status return to the default state.

**Step 3: Sync GitHub**

Comment on `#122` with what shipped, evidence, current status, and any remaining scope.
