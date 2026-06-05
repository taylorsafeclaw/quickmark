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
