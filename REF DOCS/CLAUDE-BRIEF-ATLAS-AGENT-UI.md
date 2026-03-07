# Brief for Claude: implement Atlas-style agent UI

**Copy-paste this (or the short version below) when you want the implementation to match Atlas and use everything in the ref docs.**

---

## What I want

I want the agent UI to look and behave **like it does in Atlas** when the agent is controlling the screen. That means:

- **On the browsing surface** (where the web page is and the cursor moves), not just in the sidecar:
  - A **full-screen overlay** on the page when the agent is active — the “weird” / beautiful animation: corner glow, subtle dot grid, maybe a light tint so you can tell the agent is in control.
  - The **cursor** moving in a **smooth** way (no teleporting), with **words near the cursor** that reflect what the agent is doing or thinking (e.g. “Navigating…”, “Reading page”, “Extracting…”, “Choosing a ticket”).
  - A clear **status / phase** for things like “navigating → reading page → extracting” (the ref doc has a better animation idea for this than a plain tooltip).
  - A **takeover bar** (e.g. bottom of the window): “Agent is using your logged-in accounts” plus **Take control** and **Stop**.
  - Optional: stroke highlight around the focused element, click ripple, smooth animations everywhere (sidecar + page).

I might be **missing details** or not saying everything Atlas actually does. So:

**Use the REF DOCS folder as the source of truth.** Read everything in there that’s relevant to the agent overlay, cursor, shader, takeover bar, and loading/status UI (especially `extracted/ATLAS-ANIMATION-NOTES.md`, `extracted/atlas/components/overlay.md`, `cursor.md`, `shader-params.md`, `atlas-agent-shader/`, `atlas-all-source-paths.txt`, and `ATLAS-AGENT-UI-SPEC.md`). Implement so it matches Atlas as closely as the ref docs allow — and if the ref doc describes something I didn’t mention (e.g. mask reveal, bloom, specific timings, dot pattern params), include it so we don’t miss anything.

---

## Short version (paste this to Claude)

> I want the agent UI to match **Atlas** when the agent is controlling the screen: on the **browsing surface** (where the page and cursor are), I want the full-screen overlay (corner glow, dot grid, tint), smooth cursor with a label showing what the agent is doing (“Navigating”, “Reading page”, “Extracting”, etc.), a proper status/phase animation for “navigating → reading page → extracting”, and the takeover bar (Agent is using your accounts + Take control / Stop).  
>  
> **Important:** I might be missing details. Use the **REF DOCS** folder as the source of truth. Read the relevant ref docs (ATLAS-ANIMATION-NOTES.md, atlas overlay/cursor/shader docs, atlas-agent-shader, ATLAS-AGENT-UI-SPEC.md, atlas-all-source-paths.txt) and implement everything they describe so the result matches Atlas as closely as possible — include anything from the ref doc I didn’t mention (e.g. mask animation, click ripple, shader params, phase row) so we don’t miss anything.
