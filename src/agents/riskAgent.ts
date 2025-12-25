import { ExplainState } from "../types/portfolio";

export function riskAgent(state: ExplainState): ExplainState {
  if (!state.stats) throw new Error("Stats missing");

  const { concentrationTop1, concentrationTop3, byAssetClass } = state.stats;

  const equityWeight = byAssetClass
    .filter((ac) => ac.assetClass.includes("STOCK"))
    .reduce((sum, ac) => sum + ac.weight, 0);

  const factors: string[] = [];

  if (concentrationTop1 > 0.2) {
    factors.push("Top position is more than 20% of the portfolio.");
  }
  if (concentrationTop3 > 0.5) {
    factors.push("Top 3 positions make up more than 50% of the portfolio.");
  }
  if (equityWeight > 0.8) {
    factors.push("More than 80% is in stocks (little bonds/cash).");
  }

  let riskLevel: "LOW" | "MEDIUM" | "HIGH" = "LOW";
  if (factors.length >= 2) riskLevel = "HIGH";
  else if (factors.length === 1) riskLevel = "MEDIUM";

  return {
    ...state,
    riskLevel,
    riskFactors: factors,
  };
}