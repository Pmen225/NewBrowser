# ChatGPT Atlas — Animation & Overlay System Notes
*Extracted from `/Applications/ChatGPT Atlas.app` — March 2026*

---

## Files in This Folder

| File | Contents |
|------|----------|
| `atlas-agent-shader/AgentShader-1024-NE/NW/SE/SW.tiff` | **Corner glow textures** — 1024px, one per corner. These are the directional glow images the Metal shader blends over the screen edges |
| `atlas-agent-shader/agents.metallib` | Metal shader binary for the agent screen overlay (corner glow, dot pattern, click ripple, mask trail) |
| `atlas-agent-shader/window.metallib` | Metal shader binary for the window background/border shimmer |
| `atlas-agent-shader/avatar.metallib` | Metal shader binary for the voice orb (bloop, speaking, thinking, listening states) |
| `atlas-agent-shader/*-shader-strings.txt` | Readable strings extracted from each metallib |
| `atlas-avatar-textures/` | Flow maps + noise textures used by avatar.metallib |
| `atlas-audio/` | Voice sound effects (.caf) — buttonDown, listeningStart, hangUp, etc. |
| `atlas-animation-strings.txt` | Animation-related strings from main binary |
| `atlas-aura-animation-strings.txt` | 4261 animation strings from Aura.framework |
| `atlas-spring-animation-types.txt` | Spring/animation type names from Aura |
| `atlas-motion-types.txt` | Motion framework class names |
| `atlas-shimmer-glow-strings.txt` | Shimmer/glow/gradient identifier strings |
| `atlas-swift-source-paths.txt` | Animation-related Swift source file paths |
| `atlas-all-source-paths.txt` | All 1388 Swift source file paths in Aura.framework |
| `atlas-all-view-classes.txt` | All 661 View/Renderer/Animator class names |
| `atlas-aura-all-identifiers.txt` | 90k+ unique identifiers from Aura.framework |
| `auto-organize*.json` | Lottie animations for tab auto-organize |
| `tab-groups*.json` | Lottie animations for tab groups |
| `tab-style*.json` | Lottie animations for tab style picker |
| `remove-duplicates*.json` | Lottie animations for remove-duplicates |

---

## The Screen Takeover / Agent Overlay System

### Architecture (3 layers)
```
1. AgentShaderView  ← Metal-rendered corner glow (fullscreen fixed, pointer-events:none)
2. CursorOverlayNSView + AgentCursor  ← Cursor ring + label + capsule orbit
3. AgentStrokeOverlay  ← Animated stroke border around focused element
```

### Corner Glow Shader (`agents.metallib`)
The shader has these **uniform parameters** (from struct inspection):
```
resolution          vec2  — screen size in pixels
circleColor         vec4  — the teal/brand glow color
radiusPx            float — glow radius
timeSeconds         float — wall clock time for animation
patternTimeSeconds  float — dot-pattern animation phase
dotTimeSeconds      float — dot visibility pulse phase
colorIntensity      float — glow brightness multiplier
uniformTintAmount   float — full-screen uniform tint
dotVisibility       float — how visible the dot grid is
greyTintAmount      float — desaturation amount (agent active = ~0.88)
paused              bool  — freeze animation
maskProgress        float — 0→1 reveal/dismiss animation
rippleElapsed       float — click ripple timer
maskAnimating       bool  — whether reveal animation is running
clickRippleCenterUV vec2  — UV of last click for ripple
clickRippleProgress float — click ripple expand 0→1
bottomProminent     bool  — lower corners more prominent
```

**Fragment shader entry points:**
- `fragment_main` — main composite (samples 4 corner TIFFs, adds dot grid, blends glow)
- `fragment_glow_additive` — additive glow pass
- `fragment_blur_separable` — Gaussian blur pass (for bloom)
- `fragment_downsample` — downsample for multi-pass bloom
- `fragment_upsample_add` — upsample + additive blend for bloom

**Helper functions:**
- `sampleTwinkle` — animated sparkle/twinkle effect on dots
- `computeRegionMask` — per-corner region masking
- `computeMaskTrailParams` — trail animation along mask edge
- `computeBlobForTime` — organic blob shape over time
- `computeClickRippleParams` — expanding circle from click point

### CSS Recreation of the Corner Glow
```css
/* Agent overlay — corner glow (CSS approximation of Metal shader) */
#atlas-agent-overlay {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 2147483646;
  /* 4-corner radial gradients matching AgentShader-1024-NE/NW/SE/SW.tiff positions */
  background:
    radial-gradient(ellipse 60% 45% at 100% 0%,   oklch(55.25% .085 207.66 / .22) 0%, transparent 70%),  /* NE */
    radial-gradient(ellipse 60% 45% at 0%   0%,   oklch(55.25% .085 207.66 / .15) 0%, transparent 65%),  /* NW */
    radial-gradient(ellipse 60% 45% at 100% 100%, oklch(55.25% .085 207.66 / .15) 0%, transparent 65%),  /* SE */
    radial-gradient(ellipse 60% 45% at 0%   100%, oklch(55.25% .085 207.66 / .12) 0%, transparent 60%);  /* SW */
  animation: atlasGlowIn .5s cubic-bezier(.16,1,.3,1) both;
}
@keyframes atlasGlowIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
```

---

## Agent Cursor System

### Class hierarchy (from Aura.framework)
```
AgentCursor                        — main cursor dot + ring
AgentCursorCapsuleOrbit            — orbiting capsule (the pill that shows action label)
AgentCursorWithLabel               — cursor + text label next to it
AgentCursorShowcaseView            — demo/preview
AgentArrowheadStaticOverlayView    — static arrowhead for click targeting
AgentArrowheadThoughtAccessoryRenderer — thought bubble accessory
CursorOverlayNSView                — NSView layer hosting the cursor
CursorOverlayView                  — SwiftUI wrapper
CursorRegionNSView / CursorRegionView — clickable region highlight
CursorClickRippleTargetView        — ripple effect at click point
CursorClickView                    — click animation
```

### Cursor shader uniforms (from `agents.metallib` struct):
The `clickRippleCenterUV` + `clickRippleProgress` pair drives the expanding ripple at each click point. The `greyTintAmount` drives the page desaturation (0.88 = nearly grayscale when active).

---

## Stroke Overlay (element highlighting)
```
AgentStrokeOverlay                 — animated border stroke around any element
AgentRoundedRectangleStrokeOverlay — rounded-rect version (most common)
```
These draw an animated dashed/glowing stroke border around DOM elements the agent is interacting with.

---

## Window Shader (`window.metallib`)
Used for the window chrome background shimmer effect.

**Uniforms:**
```
time          float — wall clock
resolution    vec2  — window size
intensity     float — shimmer intensity
rayProgress   float — light ray sweep progress 0→1
focusUV       vec2  — focal point UV
maskRadiusPx  float — circular reveal mask radius
maskFeatherPx float — feather/softness of mask edge
overlayAlpha  float — overall opacity
```

**Entry points:** `fragment_main`, `blit_fragment`, `vertex_main`

Internal function: `composeSceneNoBorder` — renders the full shimmer scene without a border stroke, using a palette-based color scheme.

---

## Voice Avatar Shader (`avatar.metallib`)
Used for the animated orb/bloop when voice is active.

**State functions (each is a Metal fragment function):**
- `applyIdleStateLegacy` / `applyIdleStateNew` — resting orb
- `applySpeakState` — speaking animation
- `applyListenState` — listening (microphone active)
- `applyListenAndSpeakState` — hybrid
- `applyThinkState` — thinking/processing
- `applyHaltState` — stopping
- `applyBottomAlignedBarsAndMicState` — bottom bars + mic visualization

**Texture inputs:**
- `uTextureNoise` → `noise_watercolor.png` — organic noise for orb surface
- `uFlowmapPTT` → `flowmap_outward_clockwise.png` — push-to-talk flow
- `uFlowmapThinking` → `flowmap_smooth_outward.png` — thinking flow
- `uOrbPrepassTexture` — prepass render target
- `textTexture` — text rendering

**Frame buffer (VoiceVisualFrameBuffer):**
```
avgMag              float  — average audio magnitude
cumulativeAudio     float  — cumulative audio energy
viewport            vec2   — viewport size
screenScaleFactor   float  — retina scale
touchDownTimestamp  float  — touch/click start
touchUpTimestamp    float  — touch/click end
silenceAmount       float  — silence detection
silenceTimestamp    float  — when silence started
isDarkMode          bool   — light/dark mode
isNewBloop          bool   — use new bloop design
isAdvancedBloop     bool   — advanced bloop variant
BloopColors         struct — {main, low, mid, high} color sets
isClip              bool   — clip mode
```

---

## Motion Framework (custom animation engine)

Atlas uses an internal `Motion` framework for all animations:

```swift
Motion.SpringAnimation   // spring physics (damping + stiffness)
Motion.BasicAnimation    // duration + easing
Motion.DecayAnimation    // momentum decay
Motion.AnimationGroup    // parallel/sequence groups
Motion.Animator          // drives CADisplayLink
Motion.ValueAnimation    // abstract value interpolation
```

### Key animation types found:
- `SpringAnimation` — spring physics
- `BasicAnimation` — tween with `BezierFunction` easing
- `DecayAnimation` — velocity decay (for fling/momentum)
- `BezierFunction` — custom cubic bezier easing
- `EasingFunction` — easing curve abstraction
- `AnimationGroup` — composite animation
- `StaggeredTransition` — staggered element transitions
- `BannerBarTransition` — banner enter/exit
- `ContentTransition` — content cross-fade
- `VisibilityTransition` — show/hide

### Effects:
- `JiggleEffect` — shake/jiggle
- `DirectionalStretchEffect` — stretch in direction of motion
- `AnyChangeEffect` — trigger on any value change
- `DataReceivingSideEffect` — trigger when data arrives (e.g., streaming tokens)

---

## Background Shimmer

Two classes drive background shimmer:
- `BackgroundShimmerRenderer` — low-level renderer
- `BackgroundShimmerWindowManager` — manages shimmer window lifecycle

Source: `AuraWindow/BackgroundShimmerRenderer.swift`, `AuraWindow/BackgroundShimmerWindowManager.swift`

The `window.metallib` shader powers this — the `rayProgress` uniform sweeps a light beam across.

---

## Gradient Views

- `AdaptiveMeshGradientView` — adaptive mesh gradient (responds to content)
- `AnimatedMeshGradientView` — animated mesh gradient
- `StaticMeshGradientView` — static mesh gradient
- `ImageGenerationGradientView` — gradient for image gen loading
- `CurvedGradientView` (found in strings) — curved gradient shape

These use SwiftUI's `MeshGradient` (macOS 15+) for the smooth flowing color backgrounds.

---

## Tab Strip Visual Effects

- `TabStripBackdropHighlightsView` — highlights layer behind tab strip
- `TabStripBackdropInnerShadowView` — inner shadow on tab strip
- `TopBarBackdropView` — top bar frosted glass backdrop
- `BlurredBackgroundView` — blurred backdrop
- `MacVisualEffectView` — NSVisualEffectView wrapper

---

## Lottie Animations (`Aura_AuraTabsUI.bundle`)

All `.lottie` files are ZIP archives containing `animations/animation.json`.
Already extracted to JSON in this folder:
- `auto-organize.json` / `auto-organize-dark.json`
- `tab-groups.json` / `tab-groups-dark.json`
- `tab-style.json` / `tab-style-dark.json`
- `remove-duplicates.json` / `remove-duplicates-dark.json`

---

## Key Source Files (from embedded paths)

```
AuraAgents/AgentShaderView+macOS.swift       — Metal shader view setup
AuraAgents/OperatorAgentOverlayViewModel.swift — overlay state machine
AuraCursorChat/CursorChatViewModel.swift      — cursor chat view model
AuraCursorChat/CursorChatCompletionProvider.swift
AuraWindow/BackgroundShimmerRenderer.swift    — shimmer renderer
AuraWindow/BackgroundShimmerWindowManager.swift
AuraWindow/ChatGPTSidebarOverlayController.swift — sidebar overlay
Motion/ValueAnimation.swift                   — base animation class
Motion/NSScreen+AnimationEnvironment.swift    — display link setup
LottieToolbelt/LottieAnimationView.swift      — Lottie wrapper
OAIMarkdown/TextFadeAnimator.swift            — text fade animation
```
