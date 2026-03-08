# Design system comparison: Comet vs Atlas

| Token | Comet Value | Atlas Value |
|-------|-------------|-------------|
| Primary accent | oklch(warm-carbuncle-500) 55.25% .085 207.66 | teal (Assets.car) |
| Border radius — button | var(--sys-shape-corner-extra-small), 3px | unknown — not found in source |
| Border radius — panel/dialog | .375rem, var(--sys-size-5) | unknown |
| Composer height | from overlay/sidecar CSS | unknown |
| Sidebar width | from layout.md / spacing.json | unknown |
| Font family | pplxSans, FKGroteskNeue, var(--pplx-serif) | same |
| Base font size | 12px (menu, message), 11px (code) | unknown |
| Transition — panel open | .3s, ease-in-out, slideIn keyframes | Motion framework (Atlas) |
| Z-index overlay | see comet/tokens/z-index.json | unknown |
| Animation easing | cubic-bezier(.65,.815,.735,.395), ease-in-out | spring (Atlas) |
