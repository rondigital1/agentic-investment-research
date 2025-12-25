import { Prisma } from "@prisma/client";
import { diffFromStats, buildDiffSection } from "../domain/portfolioDiff";
import { getLatestTwoSnapshots } from "../repos/portfolio.repo";
import { createResearchReport } from "../repos/researchReport.repo";
import { computePortfolioStats } from "../tools/computeStats";
import { ExplainState } from "../types/portfolio";
import { buildPortfolioExplainerGraph } from "../graph/portfolioExplainerGraph";
import { deepResearchAgent } from "../agents/deepResearchAgent";

export async function runWeeklyResearchForUser(
  userId: string,
  opts?: { useLivePrices?: boolean }
): Promise<{ reportId: string }> {
  const [latestSnapshot, previousSnapshot] = await getLatestTwoSnapshots(userId);

  if (!latestSnapshot) {
    throw new Error("User has no snapshots");
  }

  const holdings = latestSnapshot.holdings.map((h) => ({
    symbol: h.symbol,
    shares: h.shares,
    price: h.price ?? undefined,
    assetClass: h.assetClass ?? undefined,
  }));

  const nextStats = computePortfolioStats(holdings);
  const prevStats = previousSnapshot
    ? computePortfolioStats(
      previousSnapshot.holdings.map((h) => ({
        symbol: h.symbol,
        shares: h.shares,
        price: h.price ?? undefined,
        assetClass: h.assetClass ?? undefined,
      }))
    )
    : undefined;

  const portfolioDiff = diffFromStats(prevStats, nextStats);

  const graphInput: ExplainState = {
    holdings,
    useLivePrices: opts?.useLivePrices ?? false,
    portfolioDiff,
  };

  const { researchBrief, evidenceBundle } = await deepResearchAgent(graphInput);

  const graph = buildPortfolioExplainerGraph();
  const finalState = await graph.invoke(graphInput);

  if (!finalState.explanation) {
    throw new Error("Graph did not produce explanation");
  }

  const report = await createResearchReport({
    user: { connect: { id: userId } },
    snapshot: { connect: { id: latestSnapshot.id } },
    runType: "WEEKLY",
    inputJson: {
      snapshotId: latestSnapshot.id,
      previousSnapshotId: previousSnapshot?.id ?? null,
      stats: nextStats,
      portfolioDiff,
      useLivePrices: opts?.useLivePrices ?? false,
    },
    outputMd: finalState.explanation,
    status: "SUCCESS",
  });

  return { reportId: report.id };
}