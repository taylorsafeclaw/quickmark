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
