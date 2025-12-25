import { buildPortfolioExplainerGraph } from "../graph/portfolioExplainerGraph";
import { getLatestTwoSnapshots } from "../repos/portfolio.repo";
import { ensureUser } from "../repos/user.repo";
import { ExplainState, PortfolioDiff } from "../types/portfolio";
import { computePortfolioStats } from "../tools/computeStats";
import { diffFromStats } from "../domain/portfolioDiff";

const graph = buildPortfolioExplainerGraph();

export async function analyzeLatestPortfolioForUser(
  userId: string,
  opts?: { useLivePrices?: boolean }
): Promise<{ snapshotId: string; result: ExplainState; portfolioDiff?: PortfolioDiff }> {
  await ensureUser(userId);
  const [latest, prev] = await getLatestTwoSnapshots(userId);
  if (!latest) {
    throw new Error("NO_PORTFOLIO_FOUND");
  }

  const holdings = latest.holdings.map((h) => ({
    symbol: h.symbol,
    shares: h.shares,
    price: h.price ?? undefined,
    assetClass: h.assetClass ?? undefined,
  }));

  let portfolioDiff: PortfolioDiff | undefined;
  if (prev) {
    const prevHoldings = prev.holdings.map((h) => ({
      symbol: h.symbol,
      shares: h.shares,
      price: h.price ?? undefined,
      assetClass: h.assetClass ?? undefined,
    }));
    const prevStats = computePortfolioStats(prevHoldings);
    const nextStats = computePortfolioStats(holdings);
    portfolioDiff = diffFromStats(prevStats, nextStats);
  }

  const finalState = await graph.invoke({ holdings, useLivePrices: opts?.useLivePrices ?? false } as any);

  return {
    snapshotId: latest.id,
    result: finalState as ExplainState,
    portfolioDiff,
  }
}