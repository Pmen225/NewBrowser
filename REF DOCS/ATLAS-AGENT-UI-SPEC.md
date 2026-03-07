# Atlas-style agent UI — description for implementation

*Derived from REF DOCS (ATLAS-ANIMATION-NOTES.md, atlas/components/overlay.md, cursor.md, shader-params.md, atlas-agent-shader). Use this to spec or implement the “agent controlling the screen” experience.*

---

## What's actually in REF DOCS (no full implementation code)

The ref doc folder **does not contain the original Atlas implementation source code**:

| What you have | What you don't have |
|---------------|---------------------|
| **File paths** (`atlas-all-source-paths.txt`) — e.g. `AuraAgents/AgentShaderView+macOS.swift`, `OperatorAgentOverlayViewModel.swift`, `BrowseCotLoadingRow.swift` | **No `.swift` source** — those are path names from the compiled app, not extracted Swift files |
| **Shader metadata** (`atlas-agent-shader/agents-shader-strings.txt`) — function names (`fragment_main`, `sampleTwinkle`), uniform names (`dotVisibility`, `greyTintAmount`, `clickRippleCenterUV`) | **No `.metal` source** — shaders are compiled binaries (`agents.metallib`); only strings were extracted from the binary |
| **One CSS snippet** — corner glow approximation in `ATLAS-ANIMATION-NOTES.md` (see "CSS Recreation of the Corner Glow") | No cursor logic, no overlay view model code, no Metal shader source |
| **Docs** — architecture, uniform lists, class hierarchies, Lottie paths | — |

So the **only copy-pastable "code"** in the ref doc for the agent overlay is the **CSS corner-glow block** in `extracted/ATLAS-ANIMATION-NOTES.md`. Everything else is reverse‑engineered description and references; the real implementation lives inside the compiled ChatGPT Atlas.app.

---

## Scope: the *browsing surface* only

All of the following apply to **the main content area where web pages are shown and the cursor moves** — not the sidecar/chat panel. The sidecar can have its own status and animations; this doc is about what the user sees *on the page itself* when an agent is in control.

---

## 1. Full-screen agent overlay (the “weird / beautiful” animation on the page)

When the agent is controlling the screen, a **full-page overlay** is drawn *on top of the web content* to signal “agent is active.” It is non-interactive (`pointer-events: none`).

- **Corner glow**  
  Soft teal/brand-colored radial glows in all four corners (NE, NW, SE, SW), driven by a Metal shader in Atlas. A CSS approximation uses four `radial-gradient` ellipses at the corners with a shared brand color (e.g. `oklch(55.25% .085 207.66)`), low opacity (~12–22%), and a short fade-in (e.g. `.5s` ease-out).

- **Dot / grid pattern**  
  A subtle animated **dot grid** is overlaid on the page. In the shader this is controlled by params such as `dotVisibility`, `patternTimeSeconds`, `dotTimeSeconds`; the effect reads as a gentle “digital dust” or twinkle. Optional helper: `sampleTwinkle`-style animation for sparkle on the dots.

- **Page tint**  
  The page is slightly **desaturated** when the agent is active (e.g. `greyTintAmount` ~0.88 in the shader), so the overlay and cursor feel like the main focus.

- **Reveal / dismiss**  
  The overlay can animate in and out via a `maskProgress`-style 0→1 reveal (and reverse for dismiss).

So the “weird animation” and “beautiful thing that overlays on the page” is: **corner glow + animated dot pattern + light grey tint + optional mask animation**, all on the browsing surface.

---

## 2. Agent cursor and “words that reflect what the agent is doing”

The **mouse** is drawn by the agent and moves **smoothly** (no teleporting). Around it, **short text** appears that reflects the agent’s current action or thought.

- **Cursor**  
  A custom-drawn cursor (e.g. ring + center dot). Motion is smooth (e.g. spring or eased interpolation), so movement feels continuous.

- **Label / capsule orbit**  
  A **small pill/capsule** orbits or sits near the cursor and shows a **short status line**, e.g.:
  - “Navigating to…”
  - “Reading page”
  - “Extracting…”
  - “Choosing a ticket to process”
  - “Evaluating next steps”
  - “Rejecting cookies”

  In Atlas this is modeled as **AgentCursorWithLabel** and **AgentCursorCapsuleOrbit** — the “words that appear which reflect some thought of the agent or maybe what it’s doing” are this **cursor-adjacent label**, not only text in the sidecar.

- **Click feedback**  
  On click, a **ripple** can expand from the click point (`clickRippleCenterUV` + `clickRippleProgress` in the shader), giving clear feedback that the agent clicked.

So: **smooth-moving custom cursor + orbiting/label capsule with status text** = the “smooth mouse” and “words that reflect what the agent is doing” on the page.

---

## 3. Status / phase animation (“navigating / reading page / extracting page”)

The ref doc “comment” you mentioned that has the “better animation” likely refers to a **dedicated status or loading row** that shows the current phase in a clear, animated way (e.g. “Navigating” → “Reading page” → “Extracting…”). In the Atlas codebase this is related to **BrowseCotLoadingRow** — a row that can show steps or phases with a clearer, more polished animation than a plain text tooltip.

Recommendation: implement a **small status strip or row** (e.g. top or bottom of the content area, or near the takeover bar) that:
- Shows the current phase: “Navigating”, “Reading page”, “Extracting”, etc.
- Uses a **smooth transition** (fade, slide, or step indicator) when the phase changes.
- Optionally reuses or echoes the same status string that appears in the cursor label so the “words on the page” and the “phase animation” stay consistent.

---

## 4. Stroke overlay (element highlight)

When the agent focuses a specific element (e.g. a button or link), an **animated stroke** can be drawn around it:

- **AgentStrokeOverlay** / **AgentRoundedRectangleStrokeOverlay**: dashed or glowing border around the focused DOM element.
- This makes it obvious *where* the agent is about to interact, and pairs with the smooth cursor and label.

---

## 5. Takeover bar

A **persistent bar** (e.g. bottom of the window or content area) that:

- **Indicates agent control**  
  Text such as: “Logged in – Agent is using your logged-in accounts” (or similar), so the user knows the agent is acting in their session.

- **Shows context**  
  Optional: current task or location (e.g. “Incidents > Prince Mensah > 1049956” or “Home”).

- **Provides actions**  
  - **Take control** — user resumes manual control.  
  - **Stop** — stop the agent.

So the “bar which basically says a takeover or some sort” is this **status + context + Take control / Stop** bar, clearly visible and always available while the agent is active.

---

## 6. Animation quality (sidecar + browsing surface)

- **Browsing surface**  
  Overlay reveal, dot pattern, cursor motion, label appearance, stroke highlight, and ripple should all use **smooth** animation (e.g. spring or cubic-bezier, no abrupt jumps).

- **Sidecar**  
  Any status or “thinking” indicators in the sidecar should also use **smooth** transitions (e.g. “Navigating”, “Reading page”, “Extracting”) so the whole experience feels consistent.

Atlas uses a **Motion**-style framework (spring, basic, decay, groups); the important part is that both “animation in the sidecar” and “animation in the actual browsing” feel **smooth and coordinated**.

---

## 7. Summary checklist (on the page, not the sidecar)

| Element | Description |
|--------|-------------|
| **Full-page overlay** | Corner glow + dot pattern + grey tint + optional mask in/out. |
| **Smooth cursor** | Custom cursor, spring/eased motion, no teleporting. |
| **Cursor label** | Pill/capsule near cursor with short status (“Navigating…”, “Reading page”, “Extracting…”, etc.). |
| **Click ripple** | Optional expanding ripple at click position. |
| **Phase/status row** | Dedicated strip for “Navigating / Reading page / Extracting” with clear, smooth animation. |
| **Stroke overlay** | Animated border around the focused element. |
| **Takeover bar** | “Agent is using your account” + context + **Take control** + **Stop**. |

Together, these define the Atlas-like UI: **the animation on the screen itself**, **smooth mouse and words that reflect the agent’s thought or action**, and the **takeover bar**, all on the surface where web pages and the cursor live.
