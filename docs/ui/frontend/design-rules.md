# Frontend Design Rules

## Audience

- Codex 5.3

## Fast Path

- Edit `extension/styles.css` for side panel changes.
- Edit `extension/options.css` for settings changes.

## Canonical Source Files

- `extension/styles.css`: CSS for the side panel.
- `extension/options.css`: CSS for the settings surface.
- `docs/ui/atlas-shell-contract.md`: product shell vocabulary contract.

## Hard Constraints

- Do not invent a new design system unless the task explicitly asks for one.
- Keep compatibility with existing selectors and state classes.
- Do not create a second Assistant extension elsewhere; the only extension is `extension/`.

## Token Rules

- Preserve `:root` token blocks.
- Preserve `color-scheme: light dark`.
- Preserve `@media (prefers-color-scheme: dark)` token overrides.
- Preserve the current `system-ui, -apple-system, "Segoe UI", sans-serif` stack unless the task explicitly changes typography.
- Preserve semantic token naming such as `--bg`, `--text`, `--muted`, `--line`, `--surface`, and `--primary-action-bg`.

## Layout Rules

- Preserve `.assistant-shell`.
- Preserve `.stage`.
- Preserve `.thread`.
- Preserve existing compact side-panel assumptions.
- Keep layout clean, balanced, and spacious without wasted space.
- Keep positioning and control location intuitive; primary actions, navigation, overlays, and supporting actions belong where users expect them.
- Preserve rounded surfaces, narrow message widths, and explicit left or right message alignment unless the task explicitly changes layout behavior.
- Keep the thread variants intentional:
  - user messages stay as compact right-aligned pills
  - completed assistant replies stay flat and editorial
  - only the newest completed assistant reply gets the premium enter animation, once
  - active assistant work stays in the thinking-state presentation, not a generic card
- Keep the thread top and bottom padding tuned for stage actions and the composer so overlays and messages do not collide.
- Keep compact overlay width budgets viewport-relative, not parent-relative, so anchored popovers cannot collapse into slivers.
- Keep the composer on a strict width budget; the model chip and actions must never consume the input lane.
- In live threads, only the newest active thinking block should be visually dominant; older in-flight states should recede.

## Interaction Rules

- Preserve existing state classes.
- Preserve visible focus behavior with `:focus-visible`.
- Preserve overlay dimming behavior.
- Keep overlay dimming theme-sensitive; in light mode it must preserve thread readability and avoid washed-out haze.
- Keep interactions polished, maintain no jank, and preserve stable orientation.
- Keep buttons, menus, icons, and inputs in predictable positions with consistent visual roles across screens and states.
- Keep routine controls visually quiet until interaction.
- Keep assistant reply actions low-noise by default and only brighten on hover or focus.
- Keep composer focus styling soft and premium; use restrained contrast shifts instead of loud borders or heavy glows.

## Premium Feel Rules

- Use premium signifiers so the UI feels premium at a glance.
- Keep the feel defined by restraint, cleanliness, and coherence.
- Make premium come from polish and consistency, not visual excess.
- Keep motion intentional and smooth.
- Treat loading, empty, error, and offline states as crafted product surfaces, not leftovers.
- Make spacing, hierarchy, and components feel designed by one mind.
- Make positioning, control location, and navigation intuitive so the next action is obvious at a glance.
- Keep the experience intuitive and exclusive-feeling without becoming flashy.

## Accessibility Rules

- Preserve `hidden`.
- Preserve `aria-live`.
- Preserve keyboard reachability.
- Preserve compact side-panel legibility and hit area assumptions.

## Do Not Change Without Intent

- Keep shell vocabulary aligned with `docs/ui/atlas-shell-contract.md`.
- Edit extension CSS and HTML only in `extension/`. Do not add another extension copy (e.g. under `apps/`).
