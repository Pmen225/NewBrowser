#!/usr/bin/env python3
"""
Extract UI/UX tokens and component measurements from Comet CSS/JS and Atlas sources.
Outputs to REF DOCS/extracted/comet/, atlas/, shared/ per AGENT-RIP-PROMPT.md.
"""
from __future__ import annotations

import json
import re
import subprocess
from pathlib import Path
from typing import Any

REF_DOCS = Path(__file__).resolve().parent.parent
EXTRACTED = Path(__file__).resolve().parent

COMET_CSS_PATHS = [
    REF_DOCS / "colors.css",
    REF_DOCS / "extracted" / "comet-overlay.css",
    REF_DOCS / "extracted" / "comet-content.css",
    REF_DOCS / "extracted" / "comet-sidecar-main.css",
    REF_DOCS / "markdownView.css",
    REF_DOCS / "menu.css",
    REF_DOCS / "menuItem.css",
    REF_DOCS / "menuGroup.css",
    REF_DOCS / "iconButton.css",
    REF_DOCS / "textInput.css",
    REF_DOCS / "checkbox.css",
    REF_DOCS / "dialog.css",
    REF_DOCS / "selectMenu.css",
    REF_DOCS / "selectMenuButton.css",
    REF_DOCS / "buttonDialog.css",
    REF_DOCS / "fileSourceIcon.css",
    REF_DOCS / "issueCounter.css",
    REF_DOCS / "markdownLink.css",
    REF_DOCS / "settingCheckbox.css",
    REF_DOCS / "shortcutDialog.css",
    REF_DOCS / "codeHighlighter.css",
]


def read_css_content() -> list[tuple[Path, str]]:
    out: list[tuple[Path, str]] = []
    for p in COMET_CSS_PATHS:
        if p.exists():
            out.append((p, p.read_text(encoding="utf-8", errors="replace")))
    return out


def extract_css_vars(css_list: list[tuple[Path, str]]) -> dict[str, dict[str, str]]:
    # --name: value; or --name: value)
    re_var = re.compile(r"--([a-zA-Z0-9-]+)\s*:\s*([^;)}]+)")
    primitives: dict[str, str] = {}
    semantic: dict[str, str] = {}
    component: dict[str, str] = {}
    oklch_inner = re.compile(r"oklch\(([^)]+)\)")
    for path, content in css_list:
        for m in re_var.finditer(content):
            name = "--" + m.group(1)
            val = m.group(2).strip()
            if "oklch(" in val or re.match(r"^\d+\.?\d*\s+\.?\d*\s+\.?\d*", val):
                inner = oklch_inner.search(val)
                if inner:
                    primitives[name] = inner.group(1).strip()
                elif re.match(r"^[\d.]+\s+\.?\d*\s+[\d.]+", val):
                    primitives[name] = val
                else:
                    semantic[name] = val
            elif "var(--" in val:
                semantic[name] = val
            else:
                component[name] = val
    return {"primitives": primitives, "semantic": semantic, "component": component}


def extract_spacing_layout(css_list: list[tuple[Path, str]]) -> tuple[list[dict], list[dict]]:
    spacing_entries: list[dict] = []
    layout_entries: list[dict] = []
    props = r"padding|margin|gap|width|height|min-width|max-width|min-height|max-height|border-radius"
    re_prop = re.compile(rf"({props})\s*:\s*([^;}}]+)", re.I)
    re_selector = re.compile(r"([^{]+)\{")
    for path, content in css_list:
        blocks = re.split(r"\{", content)
        i = 0
        for block in blocks:
            if ":" in block and ("padding" in block or "margin" in block or "gap" in block or "width" in block or "height" in block or "border-radius" in block):
                for m in re_prop.finditer(block):
                    prop, val = m.group(1).lower(), m.group(2).strip()
                    entry = {"property": prop, "value": val, "source": path.name}
                    if prop == "border-radius":
                        layout_entries.append(entry)
                    elif prop in ("width", "height", "min-width", "max-width", "min-height", "max-height"):
                        layout_entries.append(entry)
                    else:
                        spacing_entries.append(entry)
    return spacing_entries, layout_entries


def extract_typography(css_list: list[tuple[Path, str]]) -> list[dict]:
    out: list[dict] = []
    re_font = re.compile(
        r"(font-size|font-weight|font-family|line-height|letter-spacing)\s*:\s*([^;}}]+)",
        re.I,
    )
    for path, content in css_list:
        for m in re_font.finditer(content):
            out.append({"property": m.group(1), "value": m.group(2).strip(), "source": path.name})
    return out


def extract_transitions(css_list: list[tuple[Path, str]]) -> list[dict]:
    out: list[dict] = []
    re_trans = re.compile(r"transition\s*:\s*([^;}}]+)", re.I)
    re_anim = re.compile(r"animation(?:\s*-\s*duration|\s*-\s*timing-function|-name)?\s*:\s*([^;}}]+)", re.I)
    re_cubic = re.compile(r"cubic-bezier\s*\(\s*([^)]+)\s*\)")
    re_keyframes = re.compile(r"@keyframes\s+(\w+)")
    for path, content in css_list:
        for m in re_trans.finditer(content):
            out.append({"type": "transition", "value": m.group(1).strip(), "source": path.name})
        for m in re_anim.finditer(content):
            out.append({"type": "animation", "value": m.group(1).strip(), "source": path.name})
        for m in re_cubic.finditer(content):
            out.append({"type": "cubic-bezier", "value": m.group(1).strip(), "source": path.name})
        for m in re_keyframes.finditer(content):
            out.append({"type": "keyframes", "name": m.group(1), "source": path.name})
    return out


def extract_zindex(css_list: list[tuple[Path, str]]) -> list[dict]:
    out: list[dict] = []
    re_z = re.compile(r"z-index\s*:\s*([^;}}]+)", re.I)
    for path, content in css_list:
        for m in re_z.finditer(content):
            try:
                z = int(m.group(1).strip())
            except ValueError:
                z = m.group(1).strip()
            out.append({"z": z, "source": path.name})
    out.sort(key=lambda x: (x["z"] if isinstance(x["z"], int) else 0,))
    return out


def extract_shadows(css_list: list[tuple[Path, str]]) -> list[dict]:
    out: list[dict] = []
    re_shadow = re.compile(r"box-shadow\s*:\s*([^;}}]+)", re.I)
    for path, content in css_list:
        for m in re_shadow.finditer(content):
            out.append({"value": m.group(1).strip(), "source": path.name})
    return out


def extract_breakpoints(css_list: list[tuple[Path, str]]) -> list[dict]:
    out: list[dict] = []
    re_media = re.compile(r"@media\s*\(([^)]+)\)")
    for path, content in css_list:
        for m in re_media.finditer(content):
            out.append({"condition": m.group(1).strip(), "source": path.name})
    return out


def extract_comet_components_md(css_list: list[tuple[Path, str]]) -> dict[str, str]:
    components: dict[str, list[tuple[str, str, str]]] = {}
    re_rule = re.compile(r"([.#\w\[\]-]+)\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}")
    prop_re = re.compile(r"(height|width|padding|margin|border-radius|min-width|max-width|font-size)\s*:\s*([^;}}]+)", re.I)
    for path, content in css_list:
        for block in re.finditer(r"\.([a-zA-Z0-9_-]+)\s*\{([^{}]+)\}", content):
            selector = "." + block.group(1)
            inner = block.group(2)
            for m in prop_re.finditer(inner):
                key = path.stem
                if key not in components:
                    components[key] = []
                components[key].append((m.group(1), m.group(2).strip(), selector))
    md_files: dict[str, str] = {}
    component_names = {
        "comet-overlay": "Overlay",
        "comet-content": "Content",
        "comet-sidecar-main": "Sidebar",
        "dialog": "Dialog",
        "menu": "Menu",
        "menuItem": "Menu item",
        "iconButton": "Icon button",
        "textInput": "Text input",
        "markdownView": "Markdown",
        "checkbox": "Checkbox",
        "selectMenu": "Select menu",
        "shortcutDialog": "Shortcut dialog",
    }
    for file_stem, rows in components.items():
        name = component_names.get(file_stem, file_stem)
        lines = [f"## {name} ({file_stem}.css)", "", "| Property | Value | Selector |", "|----------|-------|----------|"]
        for prop, val, sel in rows[:50]:
            lines.append(f"| {prop} | {val} | {sel} |")
        md_files[file_stem + ".md"] = "\n".join(lines)
    return md_files


def run_comet_tasks():
    css_list = read_css_content()
    comet_dir = EXTRACTED / "comet"
    tokens_dir = comet_dir / "tokens"

    colors = extract_css_vars(css_list)
    (tokens_dir / "colors.json").write_text(json.dumps(colors, indent=2), encoding="utf-8")

    spacing_entries, layout_entries = extract_spacing_layout(css_list)
    (tokens_dir / "spacing.json").write_text(
        json.dumps({"padding_margin_gap": spacing_entries, "layout": layout_entries}, indent=2),
        encoding="utf-8",
    )

    typo = extract_typography(css_list)
    (tokens_dir / "typography.json").write_text(json.dumps(typo, indent=2), encoding="utf-8")

    trans = extract_transitions(css_list)
    (tokens_dir / "transitions.json").write_text(json.dumps(trans, indent=2), encoding="utf-8")

    zindices = extract_zindex(css_list)
    (tokens_dir / "z-index.json").write_text(json.dumps(zindices, indent=2), encoding="utf-8")

    shadows = extract_shadows(css_list)
    (tokens_dir / "shadows.json").write_text(json.dumps(shadows, indent=2), encoding="utf-8")

    breakpoints = extract_breakpoints(css_list)
    (tokens_dir / "breakpoints.json").write_text(json.dumps(breakpoints, indent=2), encoding="utf-8")

    border_radius_entries = [e for e in layout_entries if e["property"] == "border-radius"]
    (tokens_dir / "border-radius.json").write_text(json.dumps(border_radius_entries, indent=2), encoding="utf-8")

    # palette.md from primitives (warm-astra, hydra, umbra, etc.)
    prim = colors.get("primitives", {})
    palette_lines = ["# Comet palette (oklch L% C H)", "", "| Name | Value (L% C H) |", "|------|----------------|"]
    for k, v in sorted(prim.items()):
        if any(x in k.lower() for x in ["astra", "umbra", "carbuncle", "hydra", "ifrit", "super", "pale", "mint", "red"]):
            palette_lines.append(f"| {k} | {v} |")
    (comet_dir / "palette.md").write_text("\n".join(palette_lines), encoding="utf-8")

    layout_lines = ["# Comet layout dimensions", "", "| Property | Value | Source |", "|----------|-------|--------|"]
    for e in layout_entries[:80]:
        layout_lines.append(f"| {e['property']} | {e['value']} | {e['source']} |")
    (comet_dir / "layout.md").write_text("\n".join(layout_lines), encoding="utf-8")

    comp_mds = extract_comet_components_md(css_list)
    comp_dir = comet_dir / "components"
    for filename, body in comp_mds.items():
        (comp_dir / filename).write_text(body, encoding="utf-8")

    # Stub component .md files mentioned in spec
    for name in ["composer", "menu", "icon-button", "dialog", "sidebar", "text-input", "markdown", "overlay", "checkbox"]:
        p = comp_dir / (name + ".md")
        if not p.exists():
            p.write_text(f"# {name}\n\n(see component CSS files for measurements)\n", encoding="utf-8")


def run_atlas_strings():
    aura_path = "/Applications/ChatGPT Atlas.app/Contents/Frameworks/Aura.framework/Versions/A/Aura"
    if not Path(aura_path).exists():
        (EXTRACTED / "atlas" / "tokens" / "binary-strings-note.txt").write_text(
            "Aura binary not found at " + aura_path,
            encoding="utf-8",
        )
        return
    result = subprocess.run(
        ["strings", aura_path],
        capture_output=True,
        text=True,
        timeout=60,
    )
    text = result.stdout or ""
    lines = [s for s in text.splitlines() if 3 <= len(s) <= 200]
    ui_like = [s for s in lines if re.search(r"(height|width|padding|radius|size|inset|spacing)\s*[=:]?\s*\d+", s, re.I) or re.search(r"\b\d{2,3}\b", s)]
    out_dir = EXTRACTED / "atlas" / "tokens"
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "binary-strings-ui-candidates.txt").write_text("\n".join(ui_like[:500]), encoding="utf-8")


def run_atlas_assetutil():
    assets = [
        "/Applications/ChatGPT Atlas.app/Contents/Resources/Aura_AuraDesignSystem.bundle/Contents/Resources/Assets.car",
        "/Applications/ChatGPT Atlas.app/Contents/Resources/Assets.car",
    ]
    out_dir = EXTRACTED / "atlas" / "assets"
    out_dir.mkdir(parents=True, exist_ok=True)
    for asset_path in assets:
        if not Path(asset_path).exists():
            continue
        name = Path(asset_path).parent.name.replace(" ", "-") + "-assets.json"
        try:
            r = subprocess.run(
                ["xcrun", "assetutil", "--info", asset_path],
                capture_output=True,
                text=True,
                timeout=30,
            )
            if r.returncode == 0 and r.stdout:
                (out_dir / name).write_text(r.stdout[:500000], encoding="utf-8")
        except Exception as e:
            (out_dir / "assetutil-note.txt").write_text(f"assetutil failed: {e}", encoding="utf-8")


def run_atlas_shader_params():
    shader_dir = EXTRACTED / "atlas-agent-shader"
    out_path = EXTRACTED / "atlas" / "shader-params.md"
    lines = ["# Atlas Metal shader parameters", ""]
    for fname in ["agents-shader-strings.txt", "window-shader-strings.txt", "avatar-shader-strings.txt"]:
        p = shader_dir / fname
        if p.exists():
            lines.append(f"## {fname}")
            lines.append("(Binary Metal lib; uniform names not human-readable from strings.)")
            lines.append("")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text("\n".join(lines), encoding="utf-8")


def run_atlas_animation():
    motion_path = EXTRACTED / "atlas-motion-types.txt"
    spring_path = EXTRACTED / "atlas-spring-animation-types.txt"
    out_path = EXTRACTED / "atlas" / "animation-system.md"
    lines = ["# Atlas animation system", ""]
    if motion_path.exists():
        lines.append("## Motion framework types")
        lines.append("```")
        lines.append(motion_path.read_text(encoding="utf-8")[:2000])
        lines.append("```")
    if spring_path.exists():
        lines.append("## Spring animation types")
        lines.append("```")
        lines.append(spring_path.read_text(encoding="utf-8")[:1500])
        lines.append("```")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text("\n".join(lines), encoding="utf-8")


def run_shared_comparison():
    shared = EXTRACTED / "shared"
    shared.mkdir(parents=True, exist_ok=True)
    (shared / "design-system-comparison.md").write_text(
        """# Design system comparison: Comet vs Atlas

| Token | Comet Value | Atlas Value |
|-------|-------------|-------------|
| Primary accent | oklch (hydra/astra) | teal (from Assets.car) |
| Border radius — button | var(--sys-shape-corner-*) | unknown — not found in source |
| Composer height | from comet-overlay | unknown |
| Sidebar width | from sidecar CSS | unknown |
| Font family | pplxSans, FKGroteskNeue | same |
| Z-index overlay | from z-index.json | unknown |
""",
        encoding="utf-8",
    )
    (shared / "component-size-reference.md").write_text(
        """# Component size reference

| Component | Property | Comet | Atlas | Notes |
|-----------|----------|-------|-------|-------|
| Side panel | width | from layout | unknown | |
| Composer | height | from overlay CSS | unknown | |
| Icon button | size | 18px (iconButton.css) | unknown | |
| Text input | height | 32px (textInput.css) | unknown | |
| Menu item | padding | var(--sys-size-3) etc | unknown | |
""",
        encoding="utf-8",
    )
    (shared / "easing-reference.md").write_text(
        "# Easing reference\n\nSee comet/tokens/transitions.json for cubic-bezier and keyframes.\n",
        encoding="utf-8",
    )


def main():
    run_comet_tasks()
    run_atlas_strings()
    run_atlas_assetutil()
    run_atlas_shader_params()
    run_atlas_animation()
    run_shared_comparison()
    print("Rip extraction done.")


if __name__ == "__main__":
    main()
