import type { ExplainState } from "../types/portfolio";
import { updateHoldingsPrices } from "../tools/marketData/priceUpdateTool";

export async function priceUpdateAgent(state: ExplainState): Promise<ExplainState> {
  const updated = await updateHoldingsPrices(state.holdings);
  return { ...state, holdings: updated };
}