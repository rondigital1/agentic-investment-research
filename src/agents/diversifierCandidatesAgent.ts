import { ExplainState } from "../types/portfolio";
import { DiversifierCandidate } from "../types/research";

type CategoryTicker = {
  category: DiversifierCandidate["category"];
  tickers: string[];
  rationale: string;
};

// Hardcoded menu of diversifier options
const DIVERSIFIER_MENU: CategoryTicker[] = [
  {
    category: "DEFENSIVE_SECTOR",
    tickers: ["PG", "JNJ", "NEE"],
    rationale: "Defensive sectors tend to exhibit lower volatility during market downturns.",
  },
  {
    category: "BONDS_SHORT_DURATION",
    tickers: ["SGOV", "BIL"],
    rationale: "Short-duration bonds offer stability with minimal interest rate sensitivity.",
  },
  {
    category: "BONDS_CORE",
    tickers: ["BND", "AGG"],
    rationale: "Core bond funds provide diversified fixed-income exposure across maturities.",
  },
  {
    category: "LOW_VOLATILITY",
    tickers: ["USMV", "SPLV"],
    rationale: "Low-volatility equity strategies target stocks with historically lower price swings.",
  },
  {
    category: "BROAD_US_EQUITY",
    tickers: ["VTI", "SCHB", "ITOT"],
    rationale: "Broad US market ETFs offer diversified exposure across all market capitalizations.",
  },
  {
    category: "INTERNATIONAL_EQUITY",
    tickers: ["VEA", "EFA"],
    rationale: "International equity funds provide geographic diversification beyond US markets.",
  },
  {
    category: "GOLD_COMMODITIES",
    tickers: ["GLD", "IAU"],
    rationale: "Gold and commodity exposure can serve as a hedge during inflationary periods.",
  },
];

/**
 * Normalize symbol to uppercase for case-insensitive comparison
 */
function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}

/**
 * Get the 3 categories to suggest based on risk level
 */
function categoriesForRisk(
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | undefined
): DiversifierCandidate["category"][] {
  switch (riskLevel) {
    case "HIGH":
      return ["DEFENSIVE_SECTOR", "BONDS_SHORT_DURATION", "LOW_VOLATILITY"];
    case "LOW":
      return ["BROAD_US_EQUITY", "INTERNATIONAL_EQUITY", "GOLD_COMMODITIES"];
    case "MEDIUM":
    default:
      return ["DEFENSIVE_SECTOR", "INTERNATIONAL_EQUITY", "BONDS_CORE"];
  }
}

/**
 * Pick the first ticker from the list that is not already held.
 * If all are held, return the first ticker anyway.
 */
function pickFirstNotHeld(
  tickers: string[],
  heldSymbols: Set<string>
): string {
  for (const ticker of tickers) {
    if (!heldSymbols.has(normalizeSymbol(ticker))) {
      return ticker;
    }
  }
  // All options are held, return first anyway
  return tickers[0];
}

/**
 * Deterministic agent that suggests exactly 3 diversifier candidates
 * based on portfolio risk level and current holdings.
 */
export function diversifierCandidatesAgent(
  state: ExplainState
): Pick<ExplainState, "diversifierCandidates"> {
  const { holdings, riskLevel } = state;

  // Build a set of currently held symbols (normalized to uppercase)
  const heldSymbols = new Set<string>(
    holdings.map((h) => normalizeSymbol(h.symbol))
  );

  // Determine which 3 categories to recommend based on risk level
  const targetCategories = categoriesForRisk(riskLevel);

  // Map each category to a concrete candidate
  const candidates: DiversifierCandidate[] = targetCategories.map(
    (category) => {
      const menu = DIVERSIFIER_MENU.find((m) => m.category === category);
      if (!menu) {
        throw new Error(`No menu found for category: ${category}`);
      }

      const ticker = pickFirstNotHeld(menu.tickers, heldSymbols);

      return {
        ticker,
        category,
        rationale: menu.rationale,
      };
    }
  );

  return { diversifierCandidates: candidates };
}