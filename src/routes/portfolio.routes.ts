import { Router } from "express";
import { requireClerkAuth, type AuthedRequest } from "../middleware/requireClerkAuth";
import { importPortfolioFromCsv } from "../services/portfolioImport.service";

export const portfolioRouter = Router();

portfolioRouter.post("/import", requireClerkAuth, async (req: AuthedRequest, res) => {
  try {
    const userId = req.auth!.userId;
    const { csvText, source } = req.body ?? {};

    const snapshot = await importPortfolioFromCsv(userId, csvText, source);

    return res.json({
      ok: true,
      snapshotId: snapshot.id,
      createdAt: snapshot.createdAt,
    });
  } catch (e: any) {
    return res.status(400).json({ error: e.message ?? "import_failed" });
  }
});