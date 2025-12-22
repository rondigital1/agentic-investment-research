import { Router } from "express";
import { requireClerkAuth, type AuthedRequest } from "../middleware/requireClerkAuth";
import { analyzeLatestPortfolioForUser } from "../services/portfolioAnalysis.service";

export const analyzeRouter = Router();

analyzeRouter.post("/", requireClerkAuth, async (req: AuthedRequest, res) => {
  try {
    const userId = req.auth!.userId;
    const useLivePrices = typeof req.body?.useLivePrices === "boolean" ? req.body.useLivePrices : false;
    const { snapshotId, result } = await analyzeLatestPortfolioForUser(userId, { useLivePrices });

    return res.json({ snapshotId, result });
  } catch (error) {
    const errorMessage = (error as any)?.message;

    if (errorMessage === "NO_PORTFOLIO_FOUND") {
      return res.status(404).json({ error: "no_portfolio_found", hint: "POST /portfolio/import first" });
    }

    return res.status(500).json({ error: errorMessage ?? "analyze_failed" });
  }
});

