import { Holding, PortfolioStats } from "../types/portfolio";

export function computePortfolioStats(holdings: Holding[]): PortfolioStats {
  if (!holdings.length) {
    throw new Error("No holdings provided");
  }

  const totalValue = holdings.reduce(
    (sum, h) => sum + h.shares * (h.price ?? 0),
    0
  );

  // Per-symbol stats
  const bySymbol = holdings.map((h) => {
    const value = h.shares * (h.price ?? 0);
    const weight = value / totalValue;
    return {
      symbol: h.symbol,
      value,
      weight,
      assetClass: h.assetClass,
    };
  });

  // Sort by weight desc
  bySymbol.sort((a, b) => b.weight - a.weight);

  // Per-asset-class stats
  const mapByClass: Record<string, { value: number }> = {};
  for (const h of holdings) {
    const ac = h.assetClass ?? "UNKNOWN";
    const value = h.shares * (h.price ?? 0);
    mapByClass[ac] = mapByClass[ac] ?? { value: 0 };
    mapByClass[ac].value += value;
  }

  const byAssetClass = Object.entries(mapByClass).map(([assetClass, { value }]) => ({
    assetClass,
    value,
    weight: value / totalValue,
  }));

  byAssetClass.sort((a, b) => b.weight - a.weight);

  const concentrationTop1 = bySymbol[0]?.weight ?? 0;
  const concentrationTop3 = bySymbol
    .slice(0, 3)
    .reduce((sum, s) => sum + s.weight, 0);

  const topSymbols = bySymbol.slice(0, 5).map((s) => s.symbol);

  return {
    totalValue,
    bySymbol,
    byAssetClass,
    topSymbols,
    concentrationTop1,
    concentrationTop3,
  };
}