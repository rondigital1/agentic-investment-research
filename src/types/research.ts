import { NewsArticle } from "../integrations/marketNews/marketNews";

export type ResearchBrief = {
  asOf: string; // ISO date-time
  scope: {
    symbols: string[];          // what we researched
    diversifierTickers: string[]; // what we researched
    timeWindowDays: number;     // e.g. 7
    maxSourcesPerSymbol: number;// e.g. 3
  };

  // high-level themes relevant to the portfolio/risk
  keyThemes: string[];          // 3–7 bullets

  // per-symbol research (bounded + cited)
  symbolBriefs: Array<{
    symbol: string;
    bullets: string[];          // 3–5 bullets max, factual-ish
    sentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE" | "MIXED";
    confidence: "LOW" | "MEDIUM" | "HIGH";
    citations: Citation[];      // must exist if bullets reference facts
  }>;

  holdingsBriefs: Array<{ symbol: string; bullets: string[]; sentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE" | "MIXED"; confidence: "LOW" | "MEDIUM" | "HIGH"; citations: Citation[]; }>;
  diversifierBriefs: Array<{ symbol: string; bullets: string[]; sentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE" | "MIXED"; confidence: "LOW" | "MEDIUM" | "HIGH"; citations: Citation[]; }>;

  // portfolio-relevant risks observed in the research
  notableRisks: string[];       // 3–7 bullets
  notableOpportunities: string[]; // 3–7 bullets

  citations: Citation[];        // deduped rollup
};

export type ResearchConfig = {
  timeWindowDays: number;       // default 7
  maxSymbols: number;           // default 5
  maxSourcesPerSymbol: number;  // default 3
};

export type Citation = {
  title: string;
  url: string;
  publisher?: string;
  publishedAt?: string; // ISO date
};

export type DiversifierCandidate = {
  ticker: string;
  category:
  | "DEFENSIVE_SECTOR"
  | "DIVIDEND_QUALITY"
  | "BROAD_US_EQUITY"
  | "INTERNATIONAL_EQUITY"
  | "BONDS_SHORT_DURATION"
  | "BONDS_CORE"
  | "GOLD_COMMODITIES"
  | "LOW_VOLATILITY"
  | "REAL_ESTATE"
  | "CASH_EQUIVALENT";
  rationale: string; // deterministic 1-liner
};

export type EvidenceBundle = {
  asOf: string;
  windowDays: number;
  perSymbolLimit: number;
  holdings: Record<string, NewsArticle[]>;
  diversifiers: Record<string, NewsArticle[]>;
  meta: {
    provider: "polygon";
    fetchedSymbols: string[];
    totalArticles: number;
    errors: Array<{ symbol: string; message: string }>;
  };
};

export type DeepResearchResult = {
  researchBrief: ResearchBrief;      // compact, LLM-consumable
  evidenceBundle: EvidenceBundle;    // raw fetched news grouped by symbol
};