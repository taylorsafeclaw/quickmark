// src/components/Editor.tsx
import { Crepe } from "@milkdown/crepe";
import { Milkdown, MilkdownProvider, useEditor } from "@milkdown/react";
import "@milkdown/crepe/theme/common/style.css";
import "@milkdown/crepe/theme/frame.css";
import { useRef } from "react";

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
