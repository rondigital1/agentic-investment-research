import { parseHoldingsCsv } from "../portfolio";
import { ensureUser } from "../repos/user.repo";
import { createSnapshot } from "../repos/portfolio.repo";

export async function importPortfolioFromCsv(
  userId: string,
  csvText: string,
  source = "csv"
) {
  if (!csvText || typeof csvText !== "string") {
    throw new Error("csvText is required");
  }

  await ensureUser(userId);

  const holdings = parseHoldingsCsv(csvText);
  if (holdings.length === 0) {
    throw new Error("No holdings found in CSV");
  }

  return createSnapshot(userId, source, holdings);
}