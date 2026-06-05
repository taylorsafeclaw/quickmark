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

Early development. See the design spec in
[`docs/superpowers/specs/`](docs/superpowers/specs/) for the full plan.

## License

[MIT](LICENSE)
