# Quickmark — Design Spec

**Date:** 2026-06-05
**Status:** Approved for planning
**Author:** Taylor Allen (with Claude)

## 1. Summary

Quickmark is a minimal, keyboard-driven, native-feeling **macOS** app for personal
notes and Claude Code prompts. Notes are plain Markdown files on disk that the user
owns. It is more opinionated and lighter than Notion (no SaaS DB, no sprawl) and
requires no setup unlike Obsidian (built-in structure out of the box).

The editing experience is a **scoped block WYSIWYG editor** (Notion-style feel) built
on an existing block-editor library, configured *down* to a small whitelist of blocks
so we never rebuild Notion. Markdown stays the on-disk source of truth, which keeps
files portable. Excalidraw drawings can be embedded inline.

### Who it's for / why it exists
A developer who lives in Claude Code, wants one clean personal place for notes and
reusable prompts, and was frustrated by Notion (too heavy, "official," gets
unorganized) and Obsidian (too minimal, too much manual setup).

## 2. Goals & non-goals

**Goals**
- Clean, minimal, opinionated-by-default — usable immediately, zero configuration.
- Keyboard-first: everything reachable without the mouse.
- Rich editing (WYSIWYG feel) with inline Excalidraw embeds.
- Files are plain, portable `.md` on disk the user owns (git-able, editable elsewhere).
- First-class but lightweight prompt + meta-prompt workflow for Claude Code.
- Native Mac look & feel; small, fast app.

**Non-goals (v1)** — explicitly cut to stay minimal:
- Global quick-capture hotkey, image paste, Mermaid, wiki-links, tags, git UI,
  export/share, in-app LLM expansion, version history.
- Notion-style blocks: databases, columns, toggles, callouts, page-embeds, web
  bookmarks, comments, mentions.
- Multi-platform (macOS only for v1).

## 3. Stack

- **Tauri** (Rust core) + **React + TypeScript** frontend.
- **WYSIWYG editor:** Milkdown — a plugin-driven WYSIWYG markdown editor built on
  ProseMirror + remark. Markdown *is* its document model (seamless transform between
  markdown text and editor state), so "WYSIWYG feel" and "markdown as source of truth"
  are the *same* thing, not opposing forces. We enable a small set of nodes and add one
  custom Excalidraw node (with its own remark parser/serializer). We configure *down*,
  not build *up*.
  - *Why not BlockNote:* its markdown export is explicitly lossy
    (`blocksToMarkdownLossy`) and its lossless native format is JSON blocks —
    incompatible with the "plain `.md` you own" goal.
- **Excalidraw:** the `@excalidraw/excalidraw` React component, embedded as a custom block.
- **Design language: clean, native Apple "Liquid Glass" feel** — translucent, layered,
  glassy surfaces; depth via blur and material rather than borders; restrained, airy,
  monochrome-leaning palette with a single accent. Concretely:
  - Transparent Tauri window + native macOS **vibrancy** behind content (via the
    `window-vibrancy` crate — `sidebar` / `underWindowBackground` / newer materials).
  - Glassy panels in the web layer via CSS `backdrop-filter: blur()` + translucent
    fills, layered over the native vibrant backdrop.
  - Hidden-inset titlebar (floating traffic lights), native menu bar, SF Pro system
    font, macOS keyboard conventions, generous spacing.
  - This look is set up in the **M1 scaffold** (transparent/vibrant window base) so
    everything is built on the glass foundation, and refined in **M5 (native polish)**.
- Target: ~native-feeling, small bundle (no bundled Chromium — uses system WebView),
  fast cold start.

## 4. Data model — files are the source of truth

### Vault
- A **vault** folder chosen on first launch (default `~/quickmark`).
- Everything lives inside it as `.md` (notes) and `.excalidraw` (drawings) files.
- App-level state (pinned list, last-opened note, window state, prompt-type defs)
  lives in `.quickmark/config.json` inside the vault — keeps `.md` files pure.

### Opinionated built-in structure (auto-created if missing)
```
<vault>/
  notes/                  general notes
  journal/                YYYY-MM-DD.md daily notes
  prompts/                prompt library
    <type>/               one folder per prompt type (refactor, debug, ...)
      _template.md        starter skeleton for new prompts of this type
      <name>.md           individual prompts
    _meta/                meta-prompts: scaffolds containing a {{seed}} slot
  drawings/               .excalidraw files
  .quickmark/config.json  app state
```

### Note ↔ Markdown ↔ blocks
- Milkdown uses remark (a markdown AST) as its core, so the document model *is*
  markdown. Loading a note and saving it is the library's native markdown↔state
  transform — not a lossy export step bolted on top.
- **Round-trip safety:** the node whitelist is restricted to nodes with clean markdown
  representations, so `.md` ↔ editor state stays clean. Anything that can't round-trip
  cleanly is not an allowed node.

### Node whitelist (the anti-bloat contract)
Allowed: paragraph; H1–H3; bold / italic / inline code; bullet list; numbered list;
checkboxes (todos); code block (syntax highlight + copy button); quote; divider;
GFM tables; **Excalidraw embed** (custom node).

### Excalidraw embeds
- Each drawing is stored as its own `.excalidraw` (JSON) file in the vault.
- A note references it via a **custom remark node** we define (e.g. a directive like
  `:::excalidraw{src="drawings/arch.excalidraw"}`) with its own parser/serializer.
  Because we own the serializer, the embed round-trips losslessly and the `.md` stays
  portable.
- This custom node's parser/serializer is the one piece we hand-roll — it is the
  supported Milkdown extension path (a ProseMirror node + remark parse/serialize),
  and it is the main thing §11 must test.
- In the editor the embed renders inline and is editable in place.

## 5. Prompt & meta-prompt system

- **Prompt types** = categories. Each type is a folder under `prompts/` with a
  `_template.md` skeleton. "New prompt → pick type" stamps the skeleton into a new file.
- **Use a prompt:** open it → one-click **Copy to clipboard** → paste into Claude Code.
  No variable-fill forms, no publish/lock step.
- **Meta-prompts** = reusable scaffolds in `prompts/_meta/`, each containing a single
  `{{seed}}` slot. Flow: pick a meta-prompt → type a small seed → Quickmark substitutes
  `{{seed}}` (pure string substitution, **no LLM call**) → shows the expanded prompt →
  copy. Claude Code does the actual thinking.

## 6. Units (independent, testable)

- **Vault service (Rust):** read/write/list `.md` and `.excalidraw`; create built-in
  folders on first run; atomic writes; file-system watch for external changes.
- **Search (Rust):** fuzzy filename match (⌘P) and full-text search (⌘⇧F) over the vault.
- **Navigator (React):** sidebar — Pinned, built-in sections (Notes / Prompts /
  Journal), file tree.
- **Editor (React + Milkdown):** scoped WYSIWYG over markdown; `⌘E` toggles a
  raw-Markdown source view (dev escape hatch); code blocks highlighted with copy button.
- **Excalidraw node (React):** custom Milkdown/ProseMirror node + remark
  parser/serializer, wrapping the Excalidraw component, backed by a `.excalidraw` file.
- **Command palette (React):** `⌘K` — run any command by typing.
- **Prompt service (React + Rust):** new-prompt-from-type (stamp skeleton),
  copy-to-clipboard.
- **Meta-prompt expander (React):** pick scaffold → seed → substitute → copy.
- **Journal (React + Rust):** `⌘T` opens/creates `journal/YYYY-MM-DD.md`.
- **Autosave controller (React + Rust):** see §8.

## 7. Key flows

- **Find:** `⌘P` fuzzy-jump · `⌘⇧F` full-text · click the tree.
- **Write:** open note → type (autosaves) → `⌘E` to peek at raw Markdown if wanted.
- **Draw:** insert Excalidraw block via slash-menu → draw inline (saved to its file).
- **New:** `⌘N` note · `⌘⇧N` new prompt (pick type → skeleton) · `⌘T` today.
- **Prompt use:** open prompt → Copy → paste into Claude Code.
- **Meta-prompt:** palette → "Expand meta-prompt" → choose scaffold → enter seed → copy.

## 8. Autosave (smart)

- **Debounced write** ~500ms after the user stops typing.
- **Also save** on: note-switch, window-blur, app-quit.
- **Atomic writes:** write to a temp file then rename, so a crash never corrupts a note.
- **External-change detection:** if the file changed on disk (e.g. edited in VS Code),
  reload safely; warn only if there are conflicting unsaved in-app edits.
- **No version history in v1** (deferred to v1.1).

## 9. Keyboard map

`⌘P` open · `⌘⇧F` search · `⌘E` raw-source toggle · `⌘N` note · `⌘⇧N` prompt ·
`⌘T` today · `⌘K` command palette · `⌘\` toggle sidebar.

## 10. Error handling

- Vault missing / no permission → first-run vault picker.
- Built-in folder missing → recreate silently.
- External file change → safe reload (warn only on real conflict).
- Meta-prompt expand with empty seed → no-op with a hint.
- Excalidraw file missing/corrupt → show a placeholder block, don't crash the note.

## 11. Testing

- **Rust unit tests:** vault file ops, atomic write, search (fuzzy + full-text),
  `{{seed}}` substitution.
- **Frontend (vitest):** command-palette dispatch, prompt stamping from type,
  meta-prompt substitution, raw-source toggle, Markdown ↔ editor round-trip on the
  whitelisted nodes — **including the custom Excalidraw node's parser/serializer**.
- Light but real — focus on the file round-trip (especially the Excalidraw node) and
  the prompt flows.

## 12. Risks

- **Markdown round-trip fidelity** — substantially reduced by choosing Milkdown
  (markdown-native via remark) over a JSON-native editor like BlockNote (whose markdown
  export is explicitly lossy). Residual risk lives in the **custom Excalidraw node's
  parser/serializer**, which we own and must test (§11).
- **Excalidraw inside Tauri's WKWebView** — Excalidraw is a heavy canvas app and Tauri
  uses system WebKit, not Chromium, where surprises live. **De-risk with an early spike**
  (load `@excalidraw/excalidraw` in a Tauri window) *before* building the editor — cheap
  now, expensive to discover later.
- **Native feel via WebView** — accepted gap; deliberate polish (vibrancy, titlebar,
  fonts, shortcuts) closes most of it for an app this minimal.
- **"Liquid Glass" fidelity in a WebView** — the *exact* native SwiftUI Liquid Glass
  material isn't directly exposed to web content. We get genuine native vibrancy behind
  the window (`window-vibrancy`) and approximate the glass surfaces in CSS
  (`backdrop-filter` + translucent layers). This reads as authentically Apple for an app
  this minimal, but pixel-perfect parity with native Liquid Glass is not a goal; if it
  ever becomes a hard requirement, that's the one thing that would argue for a native
  SwiftUI shell — out of scope for now.
