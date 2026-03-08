# Agent Prompt: Rip Atlas + Comet UI/UX Reference System

Paste this entire prompt to an agent. It will parse all source files and produce a structured design reference in `REF DOCS/extracted/`.

---

## PROMPT

You are a design-systems reverse-engineer. Your job is to rip every measurable UI/UX detail from two products — **ChatGPT Atlas** (macOS browser app) and **Comet by Perplexity** (Chrome extension) — and write structured reference files. Work silently, do all parsing with Python/bash, and produce clean output files. Do not summarise — extract the actual values.

---

### SOURCE LOCATIONS

**Comet CSS/JS files** (already extracted from agents.crx and comet_web_resources.crx):
```
/Users/junior/Documents/Documents - Prince's MacBook Pro/New Browser/REF DOCS/colors.css
/Users/junior/Documents/Documents - Prince's MacBook Pro/New Browser/REF DOCS/comet-overlay.css           (from extracted/)
/Users/junior/Documents/Documents - Prince's MacBook Pro/New Browser/REF DOCS/extracted/comet-overlay.css
/Users/junior/Documents/Documents - Prince's MacBook Pro/New Browser/REF DOCS/extracted/comet-content.css
/Users/junior/Documents/Documents - Prince's MacBook Pro/New Browser/REF DOCS/extracted/comet-sidecar-main.css
/Users/junior/Documents/Documents - Prince's MacBook Pro/New Browser/REF DOCS/markdownView.css
/Users/junior/Documents/Documents - Prince's MacBook Pro/New Browser/REF DOCS/menu.css
/Users/junior/Documents/Documents - Prince's MacBook Pro/New Browser/REF DOCS/menuItem.css
/Users/junior/Documents/Documents - Prince's MacBook Pro/New Browser/REF DOCS/menuGroup.css
/Users/junior/Documents/Documents - Prince's MacBook Pro/New Browser/REF DOCS/iconButton.css
/Users/junior/Documents/Documents - Prince's MacBook Pro/New Browser/REF DOCS/textInput.css
/Users/junior/Documents/Documents - Prince's MacBook Pro/New Browser/REF DOCS/checkbox.css
/Users/junior/Documents/Documents - Prince's MacBook Pro/New Browser/REF DOCS/dialog.css
/Users/junior/Documents/Documents - Prince's MacBook Pro/New Browser/REF DOCS/selectMenu.css
/Users/junior/Documents/Documents - Prince's MacBook Pro/New Browser/REF DOCS/selectMenuButton.css
/Users/junior/Documents/Documents - Prince's MacBook Pro/New Browser/REF DOCS/buttonDialog.css
/Users/junior/Documents/Documents - Prince's MacBook Pro/New Browser/REF DOCS/fileSourceIcon.css
/Users/junior/Documents/Documents - Prince's MacBook Pro/New Browser/REF DOCS/issueCounter.css
/Users/junior/Documents/Documents - Prince's MacBook Pro/New Browser/REF DOCS/markdownLink.css
/Users/junior/Documents/Documents - Prince's MacBook Pro/New Browser/REF DOCS/settingCheckbox.css
/Users/junior/Documents/Documents - Prince's MacBook Pro/New Browser/REF DOCS/shortcutDialog.css
/Users/junior/Documents/Documents - Prince's MacBook Pro/New Browser/REF DOCS/codeHighlighter.css
# All JS files in /REF DOCS/ (for component behaviour, sizes set in JS, palette strings)
```

**ChatGPT Atlas app:**
```
/Applications/ChatGPT Atlas.app/Contents/Frameworks/Aura.framework/Versions/A/Aura   (main binary)
/Applications/ChatGPT Atlas.app/Contents/Resources/Aura_AuraAgents.bundle/Contents/Resources/AgentShader-1024-*.tiff
/Applications/ChatGPT Atlas.app/Contents/Resources/Aura_AuraAgents.bundle/Contents/Resources/default.metallib
/Applications/ChatGPT Atlas.app/Contents/Resources/Aura_AuraWindow.bundle/Contents/Resources/default.metallib
/Applications/ChatGPT Atlas.app/Contents/Resources/ChatGPTAvatar_ChatGPTAvatar.bundle/Contents/Resources/*.png
/Applications/ChatGPT Atlas.app/Contents/Resources/Aura_AuraTabsUI.bundle/Contents/Resources/*.lottie
/Applications/ChatGPT Atlas.app/Contents/Resources/Aura_AuraDesignSystem.bundle/Contents/Resources/Assets.car
/Applications/ChatGPT Atlas.app/Contents/Resources/ChatGPTDesktopCommon_ChatGPTDesktopCommon.bundle/Contents/Resources/Assets.car
/Applications/ChatGPT Atlas.app/Contents/Resources/Assets.car
/Applications/ChatGPT Atlas.app/Contents/Frameworks/Assets.framework/Versions/A/Resources/Assets_Assets.bundle/Contents/Resources/Assets.car
```

**Already-extracted reference files in:**
```
/Users/junior/Documents/Documents - Prince's MacBook Pro/New Browser/REF DOCS/extracted/
```

---

### OUTPUT FOLDER STRUCTURE

Create all output under:
```
/Users/junior/Documents/Documents - Prince's MacBook Pro/New Browser/REF DOCS/extracted/
```

Organised as:
```
extracted/
  comet/
    tokens/
      colors.json          ← all --var: oklch(...) tokens from all Comet CSS
      spacing.json         ← all spacing values (padding, margin, gap)
      typography.json      ← font-size, font-weight, line-height, letter-spacing
      border-radius.json   ← all border-radius values with component context
      shadows.json         ← all box-shadow values with component context
      z-index.json         ← z-index values mapped to component/layer name
      transitions.json     ← all transition/animation values (duration, easing)
      breakpoints.json     ← @media breakpoints
    components/
      composer.md          ← textarea, dock, buttons: exact px sizes
      menu.md              ← all menu/popover dimensions
      icon-button.md       ← icon button sizes, states
      dialog.md            ← dialog/modal dimensions
      sidebar.md           ← sidebar widths, heights, layout
      text-input.md        ← input sizes, padding, states
      markdown.md          ← markdown view typography and spacing
      overlay.md           ← overlay/panel system measurements
      checkbox.md          ← checkbox + toggle sizes
    palette.md             ← all named color primitives (warm-astra, carbuncle, umbra etc.)
    layout.md              ← panel width, header height, composer height, all layout dims

  atlas/
    tokens/
      colors.json          ← all color values found in strings + Assets.car
      spacing.json         ← padding/margin values from binary strings
      typography.json      ← font sizes, weights from binary
      border-radius.json   ← corner radius values
      shadows.json         ← shadow values
      transitions.json     ← animation durations, easing curves
    components/
      tab-strip.md         ← tab strip: height, tab width, padding, active states
      sidebar.md           ← sidebar dimensions
      address-bar.md       ← address bar: height, padding, border-radius
      composer.md          ← input composer dimensions
      toolbar.md           ← toolbar heights and button sizes
      overlay.md           ← agent overlay: exact shader params, corner glow dimensions
      cursor.md            ← agent cursor sizes (ring diameter, label offset, capsule orbit)
      avatar-orb.md        ← voice orb dimensions and states
      window.md            ← window chrome dimensions
    shader-params.md       ← all Metal shader uniform names + ranges for agents/window/avatar
    animation-system.md   ← Motion framework: spring params, bezier curves, easing names
    assets/
      (copy all .tiff, .png textures here — already done)

  shared/
    design-system-comparison.md  ← side-by-side: Comet vs Atlas tokens compared
    oklch-palette.md             ← all oklch color values from both, mapped to semantic names
    easing-reference.md          ← all named easing curves from both with CSS cubic-bezier values
    component-size-reference.md  ← every measured component dimension in one table
```

---

### EXTRACTION TASKS

#### TASK 1 — Comet Color Tokens
Parse every CSS file listed above. Extract ALL CSS custom properties (--var-name: value).
Group by category: primitives (raw oklch), semantic (surface, text, border, etc.), component-specific.
Output to `comet/tokens/colors.json` as:
```json
{
  "primitives": { "--warm-astra-100": "98.93% .003 48.72", ... },
  "semantic": { "--bg": "oklch(var(--warm-astra-200))", ... },
  "component": { "--composer-bg": "var(--surface)", ... }
}
```

#### TASK 2 — Comet Spacing + Layout
From all CSS files extract:
- Every `padding:`, `padding-top/right/bottom/left:`, `gap:`, `margin:` value with its selector
- Every `width:`, `height:`, `min-width:`, `max-width:` on component selectors
- Every `border-radius:` value
Output to `comet/tokens/spacing.json` and `comet/layout.md` with tables showing selector → value.

#### TASK 3 — Comet Typography
Extract all: `font-size`, `font-weight`, `font-family`, `line-height`, `letter-spacing` with their selectors.
Note: Comet uses `pplxSans` (variable 100–900) and `FKGroteskNeue`.
Output to `comet/tokens/typography.json`.

#### TASK 4 — Comet Transitions + Animations
Extract all `transition:`, `animation:`, `@keyframes`, `animation-duration`, `animation-timing-function`, `cubic-bezier(...)` values.
For each easing: name it descriptively (e.g., "ease-out-expo": "cubic-bezier(.16,1,.3,1)").
Output to `comet/tokens/transitions.json` and add to `shared/easing-reference.md`.

#### TASK 5 — Comet Component Measurements
For each component CSS file, extract exact pixel/rem values and write a markdown table:
```markdown
## Composer (comet-overlay.css + comet-sidecar-main.css)
| Property | Value | Selector |
|----------|-------|----------|
| height | 44px | .composer-wrap |
| border-radius | 22px | .composer |
...
```
Write one .md per component in `comet/components/`.

#### TASK 6 — Comet Z-index Map
Extract every `z-index:` value with its selector. Sort ascending. Map to layer name.
Output `comet/tokens/z-index.json`:
```json
[
  { "z": 10, "selector": ".composer-overlay", "layer": "overlay-panel" },
  { "z": 2147483646, "selector": "#pplx-agent-overlay", "layer": "agent-overlay" },
  ...
]
```

#### TASK 7 — Comet Palette Reference
From `colors.css` and `comet-overlay.css`, extract the full warm-astra / warm-umbra / warm-carbuncle / warm-ifrit / hydra / super palette with every stop.
Write `comet/palette.md` as a markdown table: name | stop | oklch L% C H | description.

#### TASK 8 — Atlas Binary Strings Analysis
Using Python `strings` equivalent on the Aura binary:
```python
import subprocess
result = subprocess.run(['strings', '/Applications/ChatGPT Atlas.app/Contents/Frameworks/Aura.framework/Versions/A/Aura'], capture_output=True, text=True)
```
Extract:
a) All numeric literals that look like UI measurements (3..200 range, common UI sizes): find patterns like "height: X", "width: X", "padding: X", "radius: X" in adjacent strings.
b) All `CGFloat` / `Double` constants embedded as strings.
c) All `@"color name"` Objective-C string literals.
d) All SwiftUI `.frame(width:`, `.padding(`, `.cornerRadius(` patterns.
Output to `atlas/tokens/` files.

#### TASK 9 — Atlas Assets.car Extraction
Try to extract color/image names from all Assets.car files using `assetutil`:
```bash
xcrun assetutil --info /Applications/ChatGPT\ Atlas.app/Contents/Resources/Aura_AuraDesignSystem.bundle/Contents/Resources/Assets.car > /path/to/atlas-design-system-assets.json
xcrun assetutil --info /Applications/ChatGPT\ Atlas.app/Contents/Resources/Assets.car > /path/to/atlas-main-assets.json
xcrun assetutil --info /Applications/ChatGPT\ Atlas.app/Contents/Frameworks/Assets.framework/Versions/A/Resources/Assets_Assets.bundle/Contents/Resources/Assets.car > /path/to/atlas-assets-framework.json
```
Parse the JSON outputs. Extract: all color asset names + values (sRGB/P3), all image names with sizes.
Write `atlas/tokens/colors.json` from color assets.
Write `atlas/assets/asset-catalog.md` listing all named assets.

#### TASK 10 — Atlas Metal Shader Parameters
From the already-extracted shader strings files in `extracted/atlas-agent-shader/`:
Parse `agents-shader-strings.txt`, `window-shader-strings.txt`, `avatar-shader-strings.txt`.
For each shader write a structured parameter table to `atlas/shader-params.md`:
```markdown
## agents.metallib — Corner Glow Overlay
| Uniform | Type | Range / Notes |
|---------|------|---------------|
| resolution | float2 | screen size in px |
| circleColor | float4 | RGBA, the teal brand glow |
| radiusPx | float | glow radius |
| timeSeconds | float | wall clock |
...
```

#### TASK 11 — Atlas Animation System
From `atlas-motion-types.txt` and `atlas-spring-animation-types.txt`, extract and document:
- All animation class names in the Motion framework
- All transition type names
- All easing function names
- Any numeric spring params found (stiffness, damping, response values)
Write `atlas/animation-system.md` with a full reference table.

#### TASK 12 — Atlas Tab Strip + Window Chrome
From `atlas-all-view-classes.txt` and binary strings, find all tab strip and window chrome measurements.
Look for patterns like `tabHeight`, `stripHeight`, `sidebarWidth`, `headerHeight`, `toolbarHeight` in the binary.
Also run:
```bash
strings '/Applications/ChatGPT Atlas.app/Contents/Frameworks/Aura.framework/Versions/A/Aura' | grep -E "Height|Width|Radius|Padding|Spacing|Size|Inset" | grep -v "^.\{100,\}" | sort -u
```
Write `atlas/components/tab-strip.md`, `atlas/components/toolbar.md`, `atlas/components/window.md`.

#### TASK 13 — Comet JS Behaviour
From the JS files in `REF DOCS/`:
- `menus.js` — extract menu open/close animation durations, item heights
- `suggestion_input.js` — extract composer/input behaviour, sizing
- `text_prompt.js` — extract prompt input dimensions
- `icon_button.js` — extract icon button sizes and states
- `dialogs.js` — extract dialog dimensions
- `events.js` — extract event timing constants
Look for numeric literals used as UI measurements. Write `comet/components/` files.

#### TASK 14 — Shared Design System Comparison
Create `shared/design-system-comparison.md` comparing Comet vs Atlas on:
| Token | Comet Value | Atlas Value |
|-------|-------------|-------------|
| Primary accent color | oklch(55.25% .085 207.66) | teal (same family) |
| Border radius — button | Xpx | Xpx |
| Border radius — panel | Xpx | Xpx |
| Composer height | Xpx | Xpx |
| Sidebar width | Xpx | Xpx |
| Font family | pplxSans, FKGroteskNeue | pplxSans (same) |
| Base font size | Xpx | Xpx |
| Transition — panel open | Xs ease | Xs spring |
| Z-index — overlay | X | X |
...fill every row with real values.

#### TASK 15 — Component Size Master Reference
Create `shared/component-size-reference.md` — one giant table of EVERY component dimension found across both products:
```markdown
| Component | Property | Comet | Atlas | Notes |
|-----------|----------|-------|-------|-------|
| Side panel | width | 360px? | 400px? | from CSS .side-panel |
| Composer | height | Xpx | Xpx | |
| Composer | border-radius | Xpx | Xpx | |
| Send button | diameter | Xpx | Xpx | |
| Icon button | size | Xpx | Xpx | |
| Menu item | height | Xpx | Xpx | |
| Popover | border-radius | Xpx | Xpx | |
| Popover | padding | Xpx | Xpx | |
| Tab strip | height | n/a | Xpx | |
| Toolbar | height | n/a | Xpx | |
| Address bar | height | n/a | Xpx | |
| Agent cursor | ring diameter | n/a | 22px | from agent-overlay.js |
| Agent stop button | bottom offset | 28px | 28px | from content scripts |
```

---

### EXECUTION ORDER

Run tasks in this order (some depend on previous):
1, 2, 3, 4, 7 (Comet tokens — parallel)
5, 6, 13 (Comet components — after tokens)
8, 9, 10, 11, 12 (Atlas — parallel)
14, 15 (Comparison — last, after all above)

---

### NOTES

- If `xcrun assetutil` is not available, skip Task 9 and note it.
- All oklch values: keep as `L% C H` format (no leading oklch() wrapper in JSON values, add it in markdown).
- If a value can't be found, write `unknown — not found in source` rather than guessing.
- For every extracted value, note the source file and line/selector so it can be verified.
- Do not prettify or summarise — the goal is a machine-readable + human-readable spec that future agents can use to faithfully recreate both UIs.
