# Inline Side-Panel Settings Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Open settings inside the Assistant side panel instead of opening a separate options tab.

**Architecture:** Reuse the existing `options.html` and `options.js` settings logic by embedding `options.html` in the panel through an iframe-backed settings mode. The panel owns navigation into and out of settings, while `options.html` gets a dedicated `embedded=panel` compact layout that collapses the desktop sidebar into a side-panel-friendly top navigation.

**Tech Stack:** Chrome extension side panel, vanilla JS, existing extension settings storage, Vitest contract tests, CSS-only responsive layout overrides for embedded mode.

---

### Task 1: Lock the new panel settings contract

**Files:**
- Modify: `tests/extension/panel-ui-ux.spec.ts`
- Modify: `extension/panel.js`

**Step 1: Write the failing test**

Add assertions that the panel shell includes:
- `id="settings-view"`
- `id="settings-frame"`
- `id="btn-settings-back"`

Add assertions that the script:
- still contains `async function openSettingsPage()`
- no longer contains `chrome.runtime.openOptionsPage()`
- contains a settings-mode helper such as `setPanelMode("settings")`

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/extension/panel-ui-ux.spec.ts`

Expected: FAIL because the current shell does not include an inline settings surface and `openSettingsPage()` still opens the external options page.

**Step 3: Write minimal implementation**

Add the shell placeholders and replace the external options-page call with panel-mode state management.

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/extension/panel-ui-ux.spec.ts`

Expected: PASS for the new inline settings assertions.

### Task 2: Add panel-mode switching and embedded settings frame

**Files:**
- Modify: `extension/panel.js`
- Modify: `extension/styles.css`

**Step 1: Write the failing test**

Extend the shell contract test to assert:
- the main assistant surface is wrapped separately from settings
- a back button exists only for settings mode
- the header title can switch to `Settings`

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/extension/panel-ui-ux.spec.ts`

Expected: FAIL because the current panel has a single static mode.

**Step 3: Write minimal implementation**

Implement:
- a main-view wrapper
- a hidden settings-view wrapper with iframe
- `setPanelMode(mode, section?)`
- `openSettingsPage(section?)`
- `closeSettingsPage()`
- header state updates for Assistant vs Settings mode

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/extension/panel-ui-ux.spec.ts`

Expected: PASS.

### Task 3: Add embedded side-panel layout for options

**Files:**
- Modify: `extension/options.html`
- Modify: `extension/options.css`
- Modify: `extension/options.js`
- Test: `tests/extension/options-css-integrity.spec.ts`

**Step 1: Write the failing test**

Add integrity assertions for embedded mode markers, for example:
- `body[data-embedded="panel"]` or `.settings-shell--embedded`
- compact top navigation styles
- hidden desktop window-dot treatment in embedded mode

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/extension/options-css-integrity.spec.ts`

Expected: FAIL because the current options page is desktop-first only.

**Step 3: Write minimal implementation**

Implement `embedded=panel` handling:
- `options.js` reads the query string and sets a body/data attribute
- `options.css` switches to a single-column side-panel layout
- sidebar becomes a compact horizontal nav strip
- body/background/padding collapse to fit the side panel cleanly

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/extension/options-css-integrity.spec.ts`

Expected: PASS.

### Task 4: Wire settings entry points to inline mode

**Files:**
- Modify: `extension/panel.js`

**Step 1: Write the failing test**

Add a contract assertion that the kebab `Settings` action routes through the inline settings-mode path rather than the browser options page.

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/extension/panel-ui-ux.spec.ts`

Expected: FAIL because the old handler still uses the external options-page path.

**Step 3: Write minimal implementation**

Update:
- kebab settings click
- any settings recovery links/buttons in the panel

So they call `openSettingsPage(section?)`.

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/extension/panel-ui-ux.spec.ts`

Expected: PASS.

### Task 5: Verify visually at side-panel width

**Files:**
- Modify: `extension/styles.css`
- Modify: `extension/options.css`

**Step 1: Write the failing test**

Use a manual screenshot verification step instead of adding a brittle visual test.

**Step 2: Run reproduction**

Render the panel shell locally and capture:
- assistant mode
- settings mode
- one deeper settings section

Expected before fix: desktop-style options layout feels cramped in the panel.

**Step 3: Write minimal implementation**

Adjust spacing, top nav density, card padding, and iframe sizing only as needed to remove clutter.

**Step 4: Run verification**

Run:
- `node --check extension/panel.js`
- `npx vitest run tests/extension/panel-ui-ux.spec.ts tests/extension/options-css-integrity.spec.ts`
- capture updated screenshots

Expected: tests pass and settings reads cleanly within side-panel width.
