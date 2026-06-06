# Quickmark

A minimal, keyboard-driven, native-feeling **macOS** app for personal notes and
Claude Code prompts. Notes are plain Markdown files on disk that you own — more
opinionated and lighter than Notion, with zero setup unlike Obsidian.

## Why

- **Yours, on disk.** Every note is a plain `.md` file in a vault folder. Git it,
  edit it in any editor, sync it however you like.
- **Opinionated by default.** Built-in structure (Notes / Prompts / Journal) so there's
  nothing to configure.
- **Rich, but not bloated.** A WYSIWYG editor (Markdown is the source of truth) with a
  scoped set of blocks and inline Excalidraw embeds — no Notion sprawl.
- **Keyboard-first.** Quick-open, full-text search, a command palette, and shortcuts for
  everything.
- **Built for Claude Code.** First-class but lightweight prompts and *meta-prompts*
  (drop a small seed into a reusable scaffold, copy the expanded prompt).

## Stack

Tauri (Rust core) · React + TypeScript · Milkdown editor (ProseMirror + remark) ·
Excalidraw.

## Status

Early development — **M1 (foundation walking skeleton) is in place**: pick a vault, see
your `.md` files in a tree, edit one in a Milkdown WYSIWYG editor, and have changes
autosave to disk, on a translucent native window. Excalidraw embeds, search, the command
palette, prompts/meta-prompts, and node-whitelist polish come in M2–M5.

The design spec and the dated milestone plans/spikes in [`docs/`](docs/) are point-in-time
records of the original plan — this README is the single living source of current status.

## Development

Requires [Rust](https://rustup.rs) + [Node](https://nodejs.org) (macOS).

```bash
npm install
npm run tauri dev          # run the app
npm test                   # frontend tests (Vitest)
cd src-tauri && cargo test # backend tests
```

The vault defaults to `~/quickmark` (override with the `QUICKMARK_VAULT` env var).

## License

[MIT](LICENSE)
