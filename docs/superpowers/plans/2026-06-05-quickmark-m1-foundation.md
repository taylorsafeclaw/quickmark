# Quickmark M1 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A working macOS app where you pick a vault folder, see your `.md` files in a tree, open one, edit it in a Milkdown WYSIWYG editor, and have changes autosave to disk — on a translucent "liquid glass" window base.

**Architecture:** Tauri v2 app. Rust backend owns all filesystem access (a `vault` module: bootstrap built-in folders, list/read/atomic-write `.md`), exposed as Tauri commands. React + TypeScript frontend renders a file-tree navigator and a Milkdown editor, calling the Rust commands via `invoke`. Autosave is a debounced frontend hook that writes through the Rust atomic-write command. The window is transparent with native vibrancy so later glass styling sits on a real material.

**Tech Stack:** Tauri v2 (Rust), React 19 + TypeScript + Vite, `@milkdown/crepe` + `@milkdown/react`, `window-vibrancy` (Rust), Vitest (frontend tests), Rust `#[test]` + `tempfile` (backend tests).

---

## File Structure

**Rust (`src-tauri/`)**
- `src/main.rs` — app entry, registers Tauri commands, sets up window vibrancy.
- `src/vault/mod.rs` — vault module surface; `VaultError`, re-exports.
- `src/vault/paths.rs` — vault root resolution + built-in folder names/bootstrap.
- `src/vault/files.rs` — list / read / atomic-write `.md`.
- `src/commands.rs` — thin `#[tauri::command]` wrappers over `vault`.
- `Cargo.toml` — add `serde`, `serde_json`, `tempfile` (dev), `window-vibrancy`.

**Frontend (`src/`)**
- `src/lib/vault.ts` — typed `invoke` wrappers (`listNotes`, `readNote`, `writeNote`, `bootstrapVault`).
- `src/lib/tree.ts` — pure: flat relative paths → nested tree (`buildTree`).
- `src/lib/tree.test.ts` — Vitest for `buildTree`.
- `src/hooks/useDebouncedSave.ts` — debounced autosave hook.
- `src/hooks/useDebouncedSave.test.ts` — Vitest with fake timers.
- `src/components/Navigator.tsx` — renders the tree, emits `onSelect(relPath)`.
- `src/components/Editor.tsx` — Milkdown editor; `value` in, `onChange(md)` out.
- `src/App.tsx` — wires Navigator + Editor + autosave.
- `src/styles/glass.css` — glass/vibrancy base styling.
- `vitest.config.ts` — test config.

---

## Task 1: Scaffold Tauri v2 + React + TypeScript

**Files:**
- Create: whole project skeleton (generated).

- [ ] **Step 1: Scaffold into the current directory**

The repo already has `LICENSE`, `README.md`, `.gitignore`, `docs/`. Scaffold into a temp dir then move, to avoid the non-empty-dir prompt.

Run:
```bash
cd /Users/taylorallen/Development
npm create tauri-app@latest quickmark-scaffold -- --template react-ts --manager npm --yes
rsync -a --exclude .git --exclude README.md --exclude LICENSE --exclude .gitignore quickmark-scaffold/ quickmark/
rm -rf quickmark-scaffold
cd quickmark
npm install
```
Expected: `quickmark/` now has `package.json`, `src/`, `src-tauri/`, `vite.config.ts`, `index.html`.

- [ ] **Step 2: Run the dev app to verify it boots**

Run: `npm run tauri dev`
Expected: a native window opens showing the default Tauri+React page. Quit it (Cmd+Q).

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: scaffold Tauri v2 + React + TS"
```

---

## Task 2: Excalidraw-in-WKWebView spike (de-risk early)

The spec flags this as a risk to retire before building the editor. This is a throwaway spike behind a temporary route.

**Files:**
- Create: `src/spike/ExcalidrawSpike.tsx`
- Create: `docs/spikes/2026-06-05-excalidraw-wkwebview.md`

- [ ] **Step 1: Install Excalidraw**

Run: `npm install @excalidraw/excalidraw`

- [ ] **Step 2: Add a minimal spike component**

```tsx
// src/spike/ExcalidrawSpike.tsx
import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";

export function ExcalidrawSpike() {
  return (
    <div style={{ height: "100vh", width: "100vw" }}>
      <Excalidraw />
    </div>
  );
}
```

- [ ] **Step 3: Render the spike temporarily**

In `src/main.tsx`, temporarily render `<ExcalidrawSpike />` instead of `<App />`.

- [ ] **Step 4: Run and verify in the native window**

Run: `npm run tauri dev`
Verify by hand: the Excalidraw canvas loads, you can draw a rectangle, drag it, and the toolbar works inside the Tauri (WebKit) window. Note any rendering/perf issues.

- [ ] **Step 5: Record the result**

Write findings (works / issues / version) to `docs/spikes/2026-06-05-excalidraw-wkwebview.md`. Revert `main.tsx` to render `<App />`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "spike: verify Excalidraw renders in Tauri WKWebView"
```

---

## Task 3: Rust vault — built-in folder names + bootstrap

**Files:**
- Create: `src-tauri/src/vault/mod.rs`
- Create: `src-tauri/src/vault/paths.rs`
- Modify: `src-tauri/Cargo.toml` (add deps)
- Modify: `src-tauri/src/main.rs` (declare `mod vault;`)

- [ ] **Step 1: Add dependencies**

In `src-tauri/Cargo.toml`, under `[dependencies]` ensure:
```toml
serde = { version = "1", features = ["derive"] }
serde_json = "1"
window-vibrancy = "0.5"
```
And add:
```toml
[dev-dependencies]
tempfile = "3"
```

- [ ] **Step 2: Write the failing test**

```rust
// src-tauri/src/vault/paths.rs
use std::path::{Path, PathBuf};

pub const BUILTIN_DIRS: [&str; 5] = ["notes", "journal", "prompts", "prompts/_meta", "drawings"];

/// Create the opinionated built-in folder structure under `root`. Idempotent.
pub fn bootstrap(root: &Path) -> std::io::Result<()> {
    for dir in BUILTIN_DIRS {
        std::fs::create_dir_all(root.join(dir))?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn bootstrap_creates_all_builtin_dirs() {
        let tmp = tempfile::tempdir().unwrap();
        bootstrap(tmp.path()).unwrap();
        for dir in BUILTIN_DIRS {
            assert!(tmp.path().join(dir).is_dir(), "missing {dir}");
        }
    }

    #[test]
    fn bootstrap_is_idempotent() {
        let tmp = tempfile::tempdir().unwrap();
        bootstrap(tmp.path()).unwrap();
        bootstrap(tmp.path()).unwrap(); // must not error
    }
}
```

Create `src-tauri/src/vault/mod.rs`:
```rust
pub mod paths;
pub mod files;
```

Add `mod vault;` near the top of `src-tauri/src/main.rs`.

- [ ] **Step 3: Run test to verify it fails to compile**

Run: `cd src-tauri && cargo test bootstrap`
Expected: FAIL — compile error, because `mod.rs` declares `pub mod files;` but `files.rs` doesn't exist yet.

- [ ] **Step 4: Create the (empty) files module, then pass**

Create `src-tauri/src/vault/files.rs` containing a single line:
```rust
// vault file operations — implemented in Tasks 4-6
```
Re-run: `cargo test bootstrap`
Expected: PASS (2 tests: `bootstrap_creates_all_builtin_dirs`, `bootstrap_is_idempotent`).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(vault): bootstrap built-in folder structure (TDD)"
```

---

## Task 4: Rust vault — list `.md` files (recursive, relative paths)

**Files:**
- Modify: `src-tauri/src/vault/files.rs`

- [ ] **Step 1: Write the failing test**

```rust
// src-tauri/src/vault/files.rs
use std::path::{Path, PathBuf};

/// Return all `.md` file paths under `root`, relative to `root`, sorted.
pub fn list_notes(root: &Path) -> std::io::Result<Vec<String>> {
    let mut out = Vec::new();
    collect(root, root, &mut out)?;
    out.sort();
    Ok(out)
}

fn collect(root: &Path, dir: &Path, out: &mut Vec<String>) -> std::io::Result<()> {
    for entry in std::fs::read_dir(dir)? {
        let path = entry?.path();
        if path.is_dir() {
            collect(root, &path, out)?;
        } else if path.extension().and_then(|e| e.to_str()) == Some("md") {
            let rel = path.strip_prefix(root).unwrap().to_string_lossy().to_string();
            out.push(rel);
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn lists_md_files_relative_and_sorted() {
        let tmp = tempfile::tempdir().unwrap();
        let root = tmp.path();
        fs::create_dir_all(root.join("notes")).unwrap();
        fs::write(root.join("notes/b.md"), "b").unwrap();
        fs::write(root.join("notes/a.md"), "a").unwrap();
        fs::write(root.join("notes/ignore.txt"), "x").unwrap();
        let got = list_notes(root).unwrap();
        assert_eq!(got, vec!["notes/a.md".to_string(), "notes/b.md".to_string()]);
    }
}
```

- [ ] **Step 2: Run test to verify it fails, then passes**

Run: `cd src-tauri && cargo test lists_md_files`
Expected: compiles and PASS (logic above is complete). If it fails to compile, fix imports.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(vault): list markdown files recursively (TDD)"
```

---

## Task 5: Rust vault — read a note

**Files:**
- Modify: `src-tauri/src/vault/files.rs`

- [ ] **Step 1: Write the failing test**

Append to `files.rs`:
```rust
/// Read a note at `rel` (relative to `root`) as a UTF-8 string.
pub fn read_note(root: &Path, rel: &str) -> std::io::Result<String> {
    std::fs::read_to_string(root.join(rel))
}
```
Append to the `tests` module:
```rust
    #[test]
    fn reads_note_contents() {
        let tmp = tempfile::tempdir().unwrap();
        std::fs::create_dir_all(tmp.path().join("notes")).unwrap();
        std::fs::write(tmp.path().join("notes/a.md"), "# Hello").unwrap();
        assert_eq!(read_note(tmp.path(), "notes/a.md").unwrap(), "# Hello");
    }
```

- [ ] **Step 2: Run test**

Run: `cd src-tauri && cargo test reads_note_contents`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(vault): read note contents (TDD)"
```

---

## Task 6: Rust vault — atomic write a note

**Files:**
- Modify: `src-tauri/src/vault/files.rs`

- [ ] **Step 1: Write the failing test**

Append to `files.rs`:
```rust
/// Atomically write `contents` to `rel` (relative to `root`):
/// write to a temp file in the same dir, then rename over the target.
pub fn write_note(root: &Path, rel: &str, contents: &str) -> std::io::Result<()> {
    let target = root.join(rel);
    if let Some(parent) = target.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let tmp = target.with_extension("md.tmp");
    std::fs::write(&tmp, contents)?;
    std::fs::rename(&tmp, &target)?;
    Ok(())
}
```
Append to `tests`:
```rust
    #[test]
    fn writes_note_atomically_and_no_tmp_left() {
        let tmp = tempfile::tempdir().unwrap();
        write_note(tmp.path(), "notes/new.md", "content").unwrap();
        assert_eq!(read_note(tmp.path(), "notes/new.md").unwrap(), "content");
        assert!(!tmp.path().join("notes/new.md.tmp").exists(), "temp file leaked");
    }

    #[test]
    fn write_creates_missing_parent_dirs() {
        let tmp = tempfile::tempdir().unwrap();
        write_note(tmp.path(), "deep/nested/x.md", "ok").unwrap();
        assert_eq!(read_note(tmp.path(), "deep/nested/x.md").unwrap(), "ok");
    }
```

- [ ] **Step 2: Run tests**

Run: `cd src-tauri && cargo test write`
Expected: both PASS.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(vault): atomic write_note (TDD)"
```

---

## Task 7: Rust — Tauri commands + vault root resolution + window vibrancy

**Files:**
- Create: `src-tauri/src/commands.rs`
- Modify: `src-tauri/src/main.rs`
- Modify: `src-tauri/tauri.conf.json` (transparent window)

- [ ] **Step 1: Vault root resolver**

Add to `src-tauri/src/vault/paths.rs`:
```rust
/// Default vault root: ~/quickmark (override with QUICKMARK_VAULT env for tests/dev).
pub fn default_vault_root() -> PathBuf {
    if let Ok(p) = std::env::var("QUICKMARK_VAULT") {
        return PathBuf::from(p);
    }
    let home = std::env::var("HOME").expect("HOME not set");
    PathBuf::from(home).join("quickmark")
}
```

- [ ] **Step 2: Command wrappers**

```rust
// src-tauri/src/commands.rs
use crate::vault::{files, paths};

fn root() -> std::path::PathBuf {
    paths::default_vault_root()
}

#[tauri::command]
pub fn bootstrap_vault() -> Result<String, String> {
    let r = root();
    paths::bootstrap(&r).map_err(|e| e.to_string())?;
    Ok(r.to_string_lossy().to_string())
}

#[tauri::command]
pub fn list_notes() -> Result<Vec<String>, String> {
    files::list_notes(&root()).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn read_note(rel: String) -> Result<String, String> {
    files::read_note(&root(), &rel).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn write_note(rel: String, contents: String) -> Result<(), String> {
    files::write_note(&root(), &rel, &contents).map_err(|e| e.to_string())
}
```

- [ ] **Step 3: Register commands + vibrancy in `main.rs`**

```rust
// src-tauri/src/main.rs  (top)
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
mod vault;
mod commands;

use tauri::Manager;
use window_vibrancy::{apply_vibrancy, NSVisualEffectMaterial};

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let win = app.get_webview_window("main").unwrap();
            #[cfg(target_os = "macos")]
            apply_vibrancy(&win, NSVisualEffectMaterial::Sidebar, None, None)
                .expect("vibrancy failed");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::bootstrap_vault,
            commands::list_notes,
            commands::read_note,
            commands::write_note
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 4: Make the window transparent**

In `src-tauri/tauri.conf.json`, in the `app.windows[0]` object add `"transparent": true` and `"titleBarStyle": "Overlay"`. In `index.html`/root CSS ensure `html, body, #root { background: transparent; }`.

- [ ] **Step 5: Build & smoke**

Run: `cd src-tauri && cargo build`
Expected: compiles. Then `npm run tauri dev` → window is translucent (desktop shows through with blur). Quit.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: tauri commands + vault root + native vibrancy base"
```

---

## Task 8: Frontend — typed vault API wrappers

**Files:**
- Create: `src/lib/vault.ts`

- [ ] **Step 1: Write the wrappers**

```ts
// src/lib/vault.ts
import { invoke } from "@tauri-apps/api/core";

export const bootstrapVault = () => invoke<string>("bootstrap_vault");
export const listNotes = () => invoke<string[]>("list_notes");
export const readNote = (rel: string) => invoke<string>("read_note", { rel });
export const writeNote = (rel: string, contents: string) =>
  invoke<void>("write_note", { rel, contents });
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat(fe): typed vault invoke wrappers"
```

---

## Task 9: Frontend — Vitest setup + tree builder (TDD)

**Files:**
- Create: `vitest.config.ts`
- Create: `src/lib/tree.ts`
- Create: `src/lib/tree.test.ts`
- Modify: `package.json` (test script + deps)

- [ ] **Step 1: Install Vitest**

Run: `npm install -D vitest`
Add to `package.json` `"scripts"`: `"test": "vitest run"`.

- [ ] **Step 2: Vitest config**

```ts
// vitest.config.ts
import { defineConfig } from "vitest/config";
export default defineConfig({ test: { environment: "node" } });
```

- [ ] **Step 3: Write the failing test**

```ts
// src/lib/tree.test.ts
import { describe, it, expect } from "vitest";
import { buildTree } from "./tree";

describe("buildTree", () => {
  it("nests files under folders", () => {
    const tree = buildTree(["notes/a.md", "notes/sub/b.md", "prompts/c.md"]);
    expect(tree).toEqual([
      {
        name: "notes", path: "notes", type: "dir", children: [
          { name: "a.md", path: "notes/a.md", type: "file", children: [] },
          { name: "sub", path: "notes/sub", type: "dir", children: [
            { name: "b.md", path: "notes/sub/b.md", type: "file", children: [] },
          ]},
        ],
      },
      { name: "prompts", path: "prompts", type: "dir", children: [
        { name: "c.md", path: "prompts/c.md", type: "file", children: [] },
      ]},
    ]);
  });
});
```

- [ ] **Step 4: Run to verify it fails**

Run: `npm test`
Expected: FAIL — `buildTree` not found.

- [ ] **Step 5: Implement**

```ts
// src/lib/tree.ts
export type TreeNode = {
  name: string;
  path: string;
  type: "dir" | "file";
  children: TreeNode[];
};

export function buildTree(paths: string[]): TreeNode[] {
  const roots: TreeNode[] = [];
  for (const p of [...paths].sort()) {
    const parts = p.split("/");
    let level = roots;
    let acc = "";
    parts.forEach((part, i) => {
      acc = acc ? `${acc}/${part}` : part;
      const isFile = i === parts.length - 1;
      let node = level.find((n) => n.name === part);
      if (!node) {
        node = { name: part, path: acc, type: isFile ? "file" : "dir", children: [] };
        level.push(node);
      }
      level = node.children;
    });
  }
  return roots;
}
```

- [ ] **Step 6: Run to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(fe): tree builder + vitest setup (TDD)"
```

---

## Task 10: Frontend — debounced autosave hook (TDD)

**Files:**
- Create: `src/hooks/useDebouncedSave.ts`
- Create: `src/hooks/useDebouncedSave.test.ts`
- Modify: `vitest.config.ts` (jsdom for hook tests)

- [ ] **Step 1: Switch test env to jsdom + add testing-library**

Run: `npm install -D jsdom @testing-library/react @testing-library/dom`
Update `vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
export default defineConfig({ test: { environment: "jsdom" } });
```

- [ ] **Step 2: Write the failing test**

```ts
// src/hooks/useDebouncedSave.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDebouncedSave } from "./useDebouncedSave";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("useDebouncedSave", () => {
  it("saves once after the delay, with the latest value", () => {
    const save = vi.fn();
    const { result } = renderHook(() => useDebouncedSave(save, 500));
    act(() => { result.current("v1"); result.current("v2"); });
    expect(save).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(500); });
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith("v2");
  });

  it("flush() saves immediately", () => {
    const save = vi.fn();
    const { result } = renderHook(() => useDebouncedSave(save, 500));
    act(() => { result.current("x"); result.current.flush(); });
    expect(save).toHaveBeenCalledWith("x");
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `npm test`
Expected: FAIL — `useDebouncedSave` not found.

- [ ] **Step 4: Implement**

```ts
// src/hooks/useDebouncedSave.ts
import { useCallback, useEffect, useRef } from "react";

export type DebouncedSaver = ((value: string) => void) & { flush: () => void };

export function useDebouncedSave(
  save: (value: string) => void,
  delay = 500
): DebouncedSaver {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<string | null>(null);
  const saveRef = useRef(save);
  saveRef.current = save;

  const flush = useCallback(() => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    if (pending.current !== null) { saveRef.current(pending.current); pending.current = null; }
  }, []);

  const trigger = useCallback((value: string) => {
    pending.current = value;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, delay);
  }, [delay, flush]) as DebouncedSaver;

  trigger.flush = flush;

  useEffect(() => () => flush(), [flush]); // flush on unmount
  return trigger;
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `npm test`
Expected: PASS (both tree and hook tests).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(fe): debounced autosave hook (TDD)"
```

---

## Task 11: Frontend — Navigator component

**Files:**
- Create: `src/components/Navigator.tsx`

- [ ] **Step 1: Implement the component**

```tsx
// src/components/Navigator.tsx
import type { TreeNode } from "../lib/tree";

type Props = {
  tree: TreeNode[];
  selected: string | null;
  onSelect: (path: string) => void;
};

function Node({ node, selected, onSelect }: { node: TreeNode } & Omit<Props, "tree">) {
  if (node.type === "file") {
    return (
      <div
        className={`nav-file${selected === node.path ? " sel" : ""}`}
        onClick={() => onSelect(node.path)}
      >
        {node.name}
      </div>
    );
  }
  return (
    <div className="nav-dir">
      <div className="nav-dir-label">{node.name}</div>
      <div className="nav-children">
        {node.children.map((c) => (
          <Node key={c.path} node={c} selected={selected} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}

export function Navigator({ tree, selected, onSelect }: Props) {
  return (
    <nav className="navigator">
      {tree.map((n) => (
        <Node key={n.path} node={n} selected={selected} onSelect={onSelect} />
      ))}
    </nav>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat(fe): Navigator tree component"
```

---

## Task 12: Frontend — Milkdown editor component

**Files:**
- Create: `src/components/Editor.tsx`

- [ ] **Step 1: Install Milkdown**

Run: `npm install @milkdown/crepe @milkdown/react @milkdown/kit`

- [ ] **Step 2: Implement the editor**

Crepe is the batteries-included Milkdown editor; M4 will narrow its feature set to the node whitelist. For M1 we just need load + change.

```tsx
// src/components/Editor.tsx
import { Crepe } from "@milkdown/crepe";
import { Milkdown, MilkdownProvider, useEditor } from "@milkdown/react";
import "@milkdown/crepe/theme/common/style.css";
import "@milkdown/crepe/theme/frame.css";
import { useEffect, useRef } from "react";

function CrepeEditor({ value, onChange }: { value: string; onChange: (md: string) => void }) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEditor((root) => {
    const crepe = new Crepe({ root, defaultValue: value });
    crepe.on((listener) => {
      listener.markdownUpdated((_, markdown) => onChangeRef.current(markdown));
    });
    return crepe;
  }, []); // recreated per mounted note via `key` from parent

  return <Milkdown />;
}

export function Editor({ noteKey, value, onChange }: {
  noteKey: string; value: string; onChange: (md: string) => void;
}) {
  return (
    <MilkdownProvider>
      {/* key forces a fresh editor when switching notes */}
      <CrepeEditor key={noteKey} value={value} onChange={onChange} />
    </MilkdownProvider>
  );
}
```

- [ ] **Step 3: Smoke (wired in next task)**

No standalone run; verified in Task 13.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(fe): Milkdown editor component"
```

---

## Task 13: Wire App + glass styling + end-to-end smoke

**Files:**
- Modify: `src/App.tsx`
- Create: `src/styles/glass.css`
- Modify: `src/main.tsx` (import glass.css)

- [ ] **Step 1: Glass base styles**

```css
/* src/styles/glass.css */
:root { color-scheme: dark; font-family: -apple-system, "SF Pro Text", system-ui, sans-serif; }
html, body, #root { margin: 0; height: 100%; background: transparent; color: #e6e6ea; }
.app { display: grid; grid-template-columns: 260px 1fr; height: 100vh; }
.navigator {
  padding: 38px 10px 10px; overflow: auto;
  background: rgba(30,30,32,0.45); backdrop-filter: blur(30px) saturate(160%);
  border-right: 1px solid rgba(255,255,255,0.08);
}
.editor-pane { overflow: auto; background: rgba(20,20,22,0.35); backdrop-filter: blur(20px); }
.nav-file { padding: 4px 8px; border-radius: 6px; font-size: 13px; cursor: default; color: #c8c8cd; }
.nav-file:hover { background: rgba(255,255,255,0.06); }
.nav-file.sel { background: rgba(59,111,224,0.85); color: #fff; }
.nav-dir-label { padding: 8px 8px 3px; font-size: 10px; text-transform: uppercase;
  letter-spacing: .06em; color: #7a7a80; }
.nav-children { padding-left: 10px; }
```

- [ ] **Step 2: Wire App.tsx**

```tsx
// src/App.tsx
import { useEffect, useState } from "react";
import { Navigator } from "./components/Navigator";
import { Editor } from "./components/Editor";
import { buildTree, type TreeNode } from "./lib/tree";
import { useDebouncedSave } from "./hooks/useDebouncedSave";
import { bootstrapVault, listNotes, readNote, writeNote } from "./lib/vault";

export default function App() {
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [content, setContent] = useState("");

  const save = useDebouncedSave((md) => {
    if (selected) writeNote(selected, md);
  }, 500);

  async function refresh() {
    setTree(buildTree(await listNotes()));
  }

  useEffect(() => {
    (async () => { await bootstrapVault(); await refresh(); })();
  }, []);

  async function open(path: string) {
    save.flush();
    setSelected(path);
    setContent(await readNote(path));
  }

  // save on window blur
  useEffect(() => {
    const onBlur = () => save.flush();
    window.addEventListener("blur", onBlur);
    return () => window.removeEventListener("blur", onBlur);
  }, [save]);

  return (
    <div className="app">
      <Navigator tree={tree} selected={selected} onSelect={open} />
      <div className="editor-pane">
        {selected ? (
          <Editor noteKey={selected} value={content} onChange={(md) => { setContent(md); save(md); }} />
        ) : (
          <p style={{ padding: 40, opacity: 0.5 }}>Select a note</p>
        )}
      </div>
    </div>
  );
}
```

Add `import "./styles/glass.css";` to `src/main.tsx`.

- [ ] **Step 3: Seed a note and run**

Run:
```bash
mkdir -p ~/quickmark/notes && printf "# Welcome\n\nHello **quickmark**.\n" > ~/quickmark/notes/welcome.md
npm run tauri dev
```
Verify by hand:
1. Window is translucent (glass sidebar over desktop).
2. `notes/welcome.md` appears in the tree.
3. Clicking it loads the rendered markdown in the editor.
4. Type a change, wait ~1s, quit, and `cat ~/quickmark/notes/welcome.md` shows the edit persisted.

- [ ] **Step 4: Run all automated tests**

Run: `npm test && (cd src-tauri && cargo test)`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: wire navigator + editor + autosave on glass base (M1 walking skeleton)"
```

---

## Done criteria for M1

- App boots as a translucent native window.
- Vault auto-bootstraps `~/quickmark` with built-in folders.
- File tree lists `.md` files; selecting one opens it in the Milkdown editor.
- Edits autosave to disk (debounced + on blur + on note-switch) via atomic writes.
- Excalidraw-in-WebKit spike result recorded.
- `cargo test` and `npm test` green.

## What M1 deliberately omits (later milestones)
⌘P/⌘⇧F/⌘K, journal, pinned/recent, prompts + meta-prompts, raw-source toggle, the
strict node whitelist + Excalidraw custom node, first-run vault picker, external-change
detection, full native polish (titlebar/menu/fonts refinement). Those are M2–M5.
