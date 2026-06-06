# Spike: Excalidraw in Tauri (WKWebView) — 2026-06-05

**Goal:** De-risk using Excalidraw as the drawing surface for Quickmark M4, by confirming it
integrates and renders inside Tauri's macOS WebView (WKWebView).

**Version:** `@excalidraw/excalidraw@0.18.1`

## Setup used

- `src/spike/ExcalidrawSpike.tsx` — full-viewport `<Excalidraw />` with `@excalidraw/excalidraw/index.css`.
- `src/main.tsx` — temporary `const SPIKE = true` toggle rendering `<ExcalidrawSpike />` instead of `<App />`.
  Reverted to `<App />` after the spike (toggle + import removed).

## Findings

### ✅ Build / bundle integration — VERIFIED (automated)
- Installs cleanly; no peer-dependency conflicts with React 19 / Vite 7 / TS 5.8.
- `import { Excalidraw }` + the CSS import type-check and **production-build successfully**
  (`npm run build` → `tsc && vite build` passed, built in ~5.8s).
- **Cost flag:** Excalidraw adds heavy transitive deps **on top of** the existing bundle —
  cytoscape, "wardley", and mermaid diagram renderers (its diagram-import feature), plus a
  ~1.8 MB shared chunk. With the spike rendered, the build emitted chunks up to ~1.8 MB / ~1.3 MB
  (pre-gzip). These Excalidraw-specific chunks are confirmed **absent** from the normal App build
  (clean revert). For M4 this argues for **lazy-loading** the drawing view via `dynamic import()`
  so Excalidraw's payload only loads when a drawing is opened.
- **Separate observation (not Excalidraw):** even the plain App build is already large — a ~1.6 MB
  main chunk plus KaTeX fonts and ~100 CodeMirror language-mode chunks, all from **Milkdown Crepe**
  (it bundles math + full code-block syntax highlighting). Worth a later optimization pass
  (M5 polish), independent of the drawing feature.

### ⏳ Runtime render + interaction in WKWebView — NOT YET VERIFIED
This is the core risk the spike exists to retire, and it requires a human at a `tauri dev`
window (cannot be checked headlessly). **Pending manual test:**
1. `npm run tauri dev` with the SPIKE toggle on.
2. Confirm the Excalidraw canvas + toolbar render inside the native window.
3. Draw a rectangle, drag it, use the toolbar — confirm pointer events, selection, and
   rendering behave (no blank canvas, no missing fonts/icons, acceptable perf).
4. Note any WebKit-specific issues (e.g. font loading, clipboard, pointer-capture quirks).

To re-run later: set `SPIKE = true` in `src/main.tsx` (and re-add the import), or restore this
spike component from git history.

## Provisional conclusion

Build/dependency integration is **clean** — no blocker there. The remaining unknown is purely
runtime WebKit behavior, which is low-risk for a mature React canvas lib but must be eyeballed
once before committing to Excalidraw for M4. Plan for **lazy-loading** it regardless, due to bundle size.
