# Atlas asset catalog

**Source:** `xcrun assetutil --info` on ChatGPT Atlas.app Assets.car (Resources).

- **Resources-assets.json** — Full dump: Color assets (Name, Colorspace, Color components), image refs, appearances (Aqua, DarkAqua).
- Color format in dump: Color components array (e.g. sRGB or extended gray); Names like `AppIcon-Alpha_Assets/Color-1`.
- For design-system colors, run assetutil on:
  - `Aura_AuraDesignSystem.bundle/Contents/Resources/Assets.car`
  - `ChatGPTDesktopCommon_ChatGPTDesktopCommon.bundle/Contents/Resources/Assets.car`
  - `Assets.framework/.../Assets_Assets.bundle/Contents/Resources/Assets.car`

Use this file to map Atlas color asset names to values for atlas/tokens/colors.json.
