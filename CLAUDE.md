# CLAUDE.md — Quickmark

Working notes for whoever (human or model) touches this codebase. The spirit is
Karpathy's: **keep it small enough to hold in your head.** If you can't explain a piece
of this app in a sentence, it's too complicated.

## What this is

A native macOS app for personal notes + Claude Code prompts. Every note is a plain
`.md` file in a vault on disk — **the files are the source of truth, not a database.**
Rust owns the filesystem; React renders; the two talk over Tauri `invoke`.

## Principles

- **Simplicity is the feature.** The minimum code that solves the problem, nothing
  speculative. No abstraction for a single caller. No config nobody asked for. If 200
  lines could be 50, write the 50.
- **Boring and explicit beats clever.** Code is read far more than written. Clear names,
  short functions, obvious control flow. No magic.
- **Earn every dependency.** A new package has to pay for its weight (bundle size, attack
  surface, lock-in). The Excalidraw spike exists precisely because we don't add heavy deps
  on faith — measure first. (See `docs/spikes/`.)
- **Small, reviewable diffs.** One idea per change. Don't refactor adjacent code you
  weren't asked to touch. Every changed line should trace to the task.
- **Comments explain *why*, not *what*.** The code says what. Save comments for the
  non-obvious reason.

## Don't lose the user's data

This is the one thing the app cannot get wrong. Notes are someone's writing.

- All writes go through the Rust atomic-write path (temp file + rename). Never write a
  note in place where a crash could truncate it.
- The frontend never touches the filesystem directly — it calls vault commands.
- When in doubt, fail loud and keep the file intact rather than "fixing" it silently.

## How it's built

- **Rust (`src-tauri/`)** — `vault/` module is the only thing that reads/writes the disk
  (bootstrap built-in folders, list/read/atomic-write `.md`); `commands.rs` exposes thin
  `#[tauri::command]` wrappers. Vault root is `~/quickmark` (override: `QUICKMARK_VAULT`).
- **Frontend (`src/`)** — `lib/vault.ts` typed `invoke` wrappers, `lib/tree.ts` pure
  path→tree builder, `hooks/useDebouncedSave.ts` autosave, `components/` Navigator +
  Milkdown editor, `App.tsx` wiring.

## Working here

- **Test the gnarly bits, not the obvious ones.** Vault IO and the tree builder have tests
  because they're easy to get subtly wrong; trivial glue doesn't need them. TDD the logic.
- Run before claiming done: `npm test` and `cd src-tauri && cargo test`. Both green.
- Match the surrounding style. Conventional-commit messages (`feat:`, `fix:`, `chore:`).
- **Docs live in the README**, which is the single source of current status. The dated
  files in `docs/` (specs, plans, spikes) are point-in-time snapshots — append new ones,
  don't rewrite old ones to look current.
