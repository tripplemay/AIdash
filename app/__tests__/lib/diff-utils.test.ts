import { computeLineDiff, DiffHunk } from "@/lib/diff-utils";

describe("computeLineDiff", () => {
  describe("identical texts", () => {
    it("returns empty hunks for identical single-line texts", () => {
      const hunks = computeLineDiff("hello", "hello");
      expect(hunks).toEqual([]);
    });

    it("returns empty hunks for identical multi-line texts", () => {
      const text = "line1\nline2\nline3";
      const hunks = computeLineDiff(text, text);
      expect(hunks).toEqual([]);
    });
  });

  describe("single line added", () => {
    it("detects a line added at the end", () => {
      const hunks = computeLineDiff("line1", "line1\nline2");
      expect(hunks.length).toBeGreaterThanOrEqual(1);

      const addedLines = hunks.flatMap((h) =>
        h.lines.filter((l) => l.type === "added"),
      );
      expect(addedLines).toHaveLength(1);
      expect(addedLines[0].content).toBe("line2");
    });

    it("detects a line added at the beginning", () => {
      const hunks = computeLineDiff("line2", "line1\nline2");
      const addedLines = hunks.flatMap((h) =>
        h.lines.filter((l) => l.type === "added"),
      );
      expect(addedLines).toHaveLength(1);
      expect(addedLines[0].content).toBe("line1");
    });
  });

  describe("single line removed", () => {
    it("detects a line removed from the end", () => {
      const hunks = computeLineDiff("line1\nline2", "line1");
      const removedLines = hunks.flatMap((h) =>
        h.lines.filter((l) => l.type === "removed"),
      );
      expect(removedLines).toHaveLength(1);
      expect(removedLines[0].content).toBe("line2");
    });
  });

  describe("modified line", () => {
    it("shows old line as removed and new line as added", () => {
      const hunks = computeLineDiff("hello world", "hello universe");
      const removed = hunks.flatMap((h) =>
        h.lines.filter((l) => l.type === "removed"),
      );
      const added = hunks.flatMap((h) =>
        h.lines.filter((l) => l.type === "added"),
      );
      expect(removed).toHaveLength(1);
      expect(removed[0].content).toBe("hello world");
      expect(added).toHaveLength(1);
      expect(added[0].content).toBe("hello universe");
    });
  });

  describe("multiple changes across different locations", () => {
    it("produces separate hunks for distant changes", () => {
      // 10+ unchanged lines between changes to ensure separate hunks
      const oldLines = [
        "changed-old",
        ...Array.from({ length: 10 }, (_, i) => `same-${i}`),
        "also-changed-old",
      ];
      const newLines = [
        "changed-new",
        ...Array.from({ length: 10 }, (_, i) => `same-${i}`),
        "also-changed-new",
      ];

      const hunks = computeLineDiff(oldLines.join("\n"), newLines.join("\n"));
      expect(hunks.length).toBe(2);

      const firstRemoved = hunks[0].lines.filter((l) => l.type === "removed");
      expect(firstRemoved[0].content).toBe("changed-old");

      const secondRemoved = hunks[1].lines.filter((l) => l.type === "removed");
      expect(secondRemoved[0].content).toBe("also-changed-old");
    });
  });

  describe("empty strings", () => {
    it("returns empty hunks when both are empty", () => {
      const hunks = computeLineDiff("", "");
      expect(hunks).toEqual([]);
    });

    it("detects additions when old text is empty", () => {
      const hunks = computeLineDiff("", "new line");
      const added = hunks.flatMap((h) =>
        h.lines.filter((l) => l.type === "added"),
      );
      expect(added.length).toBeGreaterThanOrEqual(1);
      expect(added.some((l) => l.content === "new line")).toBe(true);
    });

    it("detects removals when new text is empty", () => {
      const hunks = computeLineDiff("old line", "");
      const removed = hunks.flatMap((h) =>
        h.lines.filter((l) => l.type === "removed"),
      );
      expect(removed.length).toBeGreaterThanOrEqual(1);
      expect(removed.some((l) => l.content === "old line")).toBe(true);
    });
  });

  describe("line numbers", () => {
    it("assigns correct line numbers to unchanged lines", () => {
      const hunks = computeLineDiff("a\nb\nc", "a\nX\nc");
      const allLines = hunks.flatMap((h) => h.lines);

      const unchangedA = allLines.find(
        (l) => l.type === "unchanged" && l.content === "a",
      );
      expect(unchangedA?.oldLineNo).toBe(1);
      expect(unchangedA?.newLineNo).toBe(1);
    });

    it("assigns oldLineNo to removed lines and newLineNo to added lines", () => {
      const hunks = computeLineDiff("a\nb", "a\nc");
      const allLines = hunks.flatMap((h) => h.lines);

      const removed = allLines.find((l) => l.type === "removed");
      expect(removed?.oldLineNo).toBe(2);
      expect(removed?.newLineNo).toBeUndefined();

      const added = allLines.find((l) => l.type === "added");
      expect(added?.newLineNo).toBe(2);
      expect(added?.oldLineNo).toBeUndefined();
    });
  });
});
