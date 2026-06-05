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
