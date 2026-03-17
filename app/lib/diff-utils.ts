export interface DiffLine {
  type: "unchanged" | "added" | "removed";
  content: string;
  oldLineNo?: number;
  newLineNo?: number;
}

export interface DiffHunk {
  oldStart: number;
  newStart: number;
  lines: DiffLine[];
}

const CONTEXT_LINES = 3;

function computeLCS(oldLines: string[], newLines: string[]): boolean[][] {
  const m = oldLines.length;
  const n = newLines.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0)
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        oldLines[i - 1] === newLines[j - 1]
          ? dp[i - 1][j - 1] + 1
          : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  const inLCS: boolean[][] = Array.from({ length: m }, () =>
    Array(n).fill(false)
  );
  let i = m;
  let j = n;
  while (i > 0 && j > 0) {
    if (oldLines[i - 1] === newLines[j - 1]) {
      inLCS[i - 1][j - 1] = true;
      i--;
      j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  return inLCS;
}

function buildRawDiff(oldLines: string[], newLines: string[]): DiffLine[] {
  const lcs = computeLCS(oldLines, newLines);
  const result: DiffLine[] = [];
  let oi = 0;
  let ni = 0;

  while (oi < oldLines.length || ni < newLines.length) {
    if (
      oi < oldLines.length &&
      ni < newLines.length &&
      lcs[oi][ni]
    ) {
      result.push({
        type: "unchanged",
        content: oldLines[oi],
        oldLineNo: oi + 1,
        newLineNo: ni + 1,
      });
      oi++;
      ni++;
    } else if (oi < oldLines.length && (ni >= newLines.length || !hasMatchAhead(lcs, oi, ni, newLines.length))) {
      result.push({
        type: "removed",
        content: oldLines[oi],
        oldLineNo: oi + 1,
      });
      oi++;
    } else if (ni < newLines.length) {
      result.push({
        type: "added",
        content: newLines[ni],
        newLineNo: ni + 1,
      });
      ni++;
    }
  }

  return result;
}

function hasMatchAhead(
  lcs: boolean[][],
  oi: number,
  ni: number,
  newLen: number
): boolean {
  for (let j = ni; j < newLen; j++) {
    if (lcs[oi][j]) return true;
  }
  return false;
}

export function computeLineDiff(oldText: string, newText: string): DiffHunk[] {
  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");
  const rawDiff = buildRawDiff(oldLines, newLines);

  const changeIndices = new Set<number>();
  rawDiff.forEach((line, idx) => {
    if (line.type !== "unchanged") {
      for (
        let c = Math.max(0, idx - CONTEXT_LINES);
        c <= Math.min(rawDiff.length - 1, idx + CONTEXT_LINES);
        c++
      ) {
        changeIndices.add(c);
      }
    }
  });

  if (changeIndices.size === 0) return [];

  const sortedIndices = Array.from(changeIndices).sort((a, b) => a - b);
  const hunks: DiffHunk[] = [];
  let currentLines: DiffLine[] = [];
  let hunkOldStart = 0;
  let hunkNewStart = 0;
  let prevIdx = -2;

  for (const idx of sortedIndices) {
    if (idx !== prevIdx + 1 && currentLines.length > 0) {
      hunks.push({
        oldStart: hunkOldStart,
        newStart: hunkNewStart,
        lines: currentLines,
      });
      currentLines = [];
    }

    if (currentLines.length === 0) {
      hunkOldStart = rawDiff[idx].oldLineNo ?? rawDiff[idx].newLineNo ?? 1;
      hunkNewStart = rawDiff[idx].newLineNo ?? rawDiff[idx].oldLineNo ?? 1;
    }

    currentLines.push(rawDiff[idx]);
    prevIdx = idx;
  }

  if (currentLines.length > 0) {
    hunks.push({
      oldStart: hunkOldStart,
      newStart: hunkNewStart,
      lines: currentLines,
    });
  }

  return hunks;
}
