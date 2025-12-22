import { Router } from "express";
import { requireClerkAuth, type AuthedRequest } from "../middleware/requireClerkAuth";
import { runWeeklyResearchForUser } from "../services/weeklyResearch.service";

export const portfolioRouter = Router();

portfolioRouter.post("/research", requireClerkAuth, async (req: AuthedRequest, res) => {
  try {
    const userId = req.auth!.userId;
    const { useLivePrices } = req.body ?? {};

    const report = await runWeeklyResearchForUser(userId, { useLivePrices });

    return res.json({ reportId: report.reportId });
  } catch (e: any) {
    return res.status(400).json({ error: e.message ?? "research_failed" });
  }
});