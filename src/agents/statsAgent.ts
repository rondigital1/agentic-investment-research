import { ExplainState } from "../types/portfolio";
import { computePortfolioStats } from "../tools/computeStats";

export function statsAgent(state: ExplainState): ExplainState {
  if (!state.holdings?.length) {
    throw new Error("No holdings in state");
  }

  const stats = computePortfolioStats(state.holdings);

  return {
    ...state,
    stats,
  };
}