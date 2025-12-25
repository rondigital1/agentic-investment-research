import type { PortfolioDiff } from "../domain/portfolioDiff";
import { DiversifierCandidate, ResearchBrief, EvidenceBundle } from "./research";
export type { PortfolioDiff } from "../domain/portfolioDiff";

export type Holding = {
  symbol: string;
  shares: number;
  price: number | undefined;
  assetClass: string | undefined;
};

export type PortfolioStats = {
  totalValue: number;
  bySymbol: {
    symbol: string;
    value: number;
    weight: number;
    assetClass: string | undefined;
  }[];
  byAssetClass: {
    assetClass: string;
    value: number;
    weight: number;
  }[];
  topSymbols: string[];
  concentrationTop1: number;
  concentrationTop3: number;
};

export type ExplainState = {
  holdings: Holding[];
  stats?: PortfolioStats;
  explanation?: string;
  riskLevel?: "LOW" | "MEDIUM" | "HIGH";
  riskFactors?: string[];
  warning?: string;
  diversificationIdeas?: string;
  useLivePrices?: boolean;
  portfolioDiff?: PortfolioDiff;
  researchBrief?: ResearchBrief;
  evidenceBundle?: EvidenceBundle;
  diversifierCandidates?: DiversifierCandidate[];
};
