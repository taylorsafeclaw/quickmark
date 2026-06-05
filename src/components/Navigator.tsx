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
