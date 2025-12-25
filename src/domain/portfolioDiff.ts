import type { PortfolioStats } from "../types/portfolio";

export type WeightChange = {
  symbol: string;
  prevWeight: number; // 0..1
  nextWeight: number; // 0..1
  delta: number;      // next - prev
};

export type PortfolioDiff = {
  added: string[];
  removed: string[];
  weightChanges: WeightChange[];
  meta?: {
    threshold: number;
    topN: number;
  };
};

export type PortfolioDiffOptions = {
  /** Minimum absolute weight delta to include (default 0.02 = 2%) */
  threshold?: number;
  /** Max number of weight changes to return (default 5) */
  topN?: number;
};

function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}

function buildWeightMap(stats: PortfolioStats): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of stats.bySymbol) {
    map.set(normalizeSymbol(row.symbol), row.weight);
  }

  return map;
}

export function diffFromStats(
  prevStats: PortfolioStats | undefined,
  nextStats: PortfolioStats,
  options: PortfolioDiffOptions = {}
): PortfolioDiff {
  const threshold = options.threshold ?? 0.02;
  const topN = options.topN ?? 5;

  // If no previous stats, there is no "change" to compute.
  // Keep it consistent with your explainer: it'll say "No prior snapshot to compare."
  if (!prevStats) {
    return {
      added: [],
      removed: [],
      weightChanges: [],
      meta: { threshold, topN },
    };
  }

  const prevMap = buildWeightMap(prevStats);
  const nextMap = buildWeightMap(nextStats);

  const prevSyms = new Set(prevMap.keys());
  const nextSyms = new Set(nextMap.keys());

  const added: string[] = [];
  const removed: string[] = [];

  for (const s of nextSyms) if (!prevSyms.has(s)) added.push(s);
  for (const s of prevSyms) if (!nextSyms.has(s)) removed.push(s);

  added.sort();
  removed.sort();

  const allSyms = new Set<string>([...prevSyms, ...nextSyms]);

  const weightChanges: WeightChange[] = [];
  for (const sym of allSyms) {
    const prevWeight = prevMap.get(sym) ?? 0;
    const nextWeight = nextMap.get(sym) ?? 0;
    const delta = nextWeight - prevWeight;

    if (Math.abs(delta) >= threshold) {
      weightChanges.push({ symbol: sym, prevWeight, nextWeight, delta });
    }
  }

  weightChanges.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  return {
    added,
    removed,
    weightChanges: weightChanges.slice(0, topN),
    meta: { threshold, topN },
  };
}

function fmtPct(x: number) {
  return `${Math.round(x * 100)}%`;
}

export function buildDiffSection(diff: PortfolioDiff | undefined) {
  if (!diff) {
    return `No prior snapshot to compare.`;
  }

  const added = (diff.added ?? []).slice(0, 5);
  const removed = (diff.removed ?? []).slice(0, 5);
  const changes = (diff.weightChanges ?? []).slice(0, 5);

  const lines: string[] = [];

  if (added.length) lines.push(`- Added: ${added.join(", ")}`);
  if (removed.length) lines.push(`- Removed: ${removed.join(", ")}`);

  if (changes.length) {
    lines.push(`- Biggest allocation moves:`);
    for (const c of changes) {
      const sign = c.delta >= 0 ? "+" : "";
      lines.push(
        `  • ${c.symbol}: ${fmtPct(c.prevWeight)} → ${fmtPct(c.nextWeight)} (${sign}${fmtPct(c.delta)})`
      );
    }
  }

  if (!lines.length) {
    return `No material changes since the last snapshot.`;
  }

  return lines.join("\n");
}