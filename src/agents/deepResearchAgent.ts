import pLimit from "p-limit";
import type { ExplainState } from "../types/portfolio"; // adjust import to your ExplainState location
import type { DeepResearchResult, EvidenceBundle } from "../types/research";
import type { NewsArticle } from "../integrations/marketNews/marketNews"; // adjust to your NewsArticle location
import { PolygonNewsProvider } from "../integrations/marketNews/providers/polygon";

type FetchOpts = {
  days: number;            // 7
  perSymbolLimit: number;  // 3
  concurrency: number;     // 3
};

type SymbolScope = {
  holdingsSymbols: string[];
  diversifierTickers: string[];
};

type Provider = {
  fetchSymbolNews: (symbol: string, opts: { days: number; limit: number }) => Promise<NewsArticle[]>;
};

type FetchResult = {
  symbol: string;
  articles: NewsArticle[];
  error?: string;
};


export async function deepResearchAgent(
  state: ExplainState,
  deps?: { provider?: Provider; fetchOpts?: Partial<FetchOpts> }
): Promise<DeepResearchResult> {
  const scope = computeResearchScope(state);

  const fetchOpts: FetchOpts = {
    days: 7,
    perSymbolLimit: 3,
    concurrency: 3,
    ...deps?.fetchOpts,
  };

  const provider = deps?.provider ?? new PolygonNewsProvider();

  const evidenceBundle = await buildEvidenceBundle({
    scope,
    provider,
    days: 7,
    perSymbolLimit: 3,
    concurrency: 3,
  });

  const researchBrief = {
    asOf: evidenceBundle.asOf,
    scope: {
      symbols: scope.holdingsSymbols,
      diversifierTickers: scope.diversifierTickers,
      timeWindowDays: 7,
      maxSourcesPerSymbol: 3,
    },
    keyThemes: [],
    symbolBriefs: [],
    holdingsBriefs: [],
    diversifierBriefs: [],
    notableRisks: [],
    notableOpportunities: [],
    citations: [],
  };

  return { researchBrief, evidenceBundle };
}

/**
 * Deterministically choose: top 5 holdings + 3 diversifiers
 */
export function computeResearchScope(state: ExplainState): SymbolScope {
  const holdingsSymbols = (state.stats?.topSymbols ?? [])
    .slice(0, 5)
    .map(normalizeSymbol)
    .filter(Boolean);

  const diversifierTickers = (state.diversifierCandidates ?? [])
    .map((c) => normalizeSymbol(c.ticker))
    .slice(0, 3)
    .filter(Boolean);

  return { holdingsSymbols, diversifierTickers };
}

export async function buildEvidenceBundle({
  scope,
  provider,
  days,
  perSymbolLimit,
  concurrency,
}: {
  scope: SymbolScope;
  provider: Provider;
  days: number;
  perSymbolLimit: number;
  concurrency: number;
}): Promise<EvidenceBundle> {
  const asOf = new Date().toISOString();

  const limiter = pLimit(concurrency);

  const holdingsPromises = scope.holdingsSymbols.map((symbol) =>
    limiter(() => fetchOneSymbol(provider, symbol, {
      days, perSymbolLimit,
      concurrency: 0
    }))
  );
  const diversifierPromises = scope.diversifierTickers.map((symbol) =>
    limiter(() => fetchOneSymbol(provider, symbol, {
      days, perSymbolLimit,
      concurrency: 0
    }))
  );

  const holdingsResults = await Promise.all(holdingsPromises);
  const diversifierResults = await Promise.all(diversifierPromises);

  const holdings = resultsToRecord(holdingsResults);
  const diversifiers = resultsToRecord(diversifierResults);

  const fetchedSymbols = uniq([...scope.holdingsSymbols, ...scope.diversifierTickers]);
  const totalArticles = countArticles(holdings) + countArticles(diversifiers);

  const errors = [...holdingsResults, ...diversifierResults]
    .filter((r) => r.error)
    .map((r) => ({ symbol: r.symbol, message: r.error! }));

  return {
    asOf,
    windowDays: days,
    perSymbolLimit: perSymbolLimit,
    holdings,
    diversifiers,
    meta: {
      provider: "polygon",
      fetchedSymbols,
      totalArticles,
      errors,
    },
  };
}

export async function fetchOneSymbol(
  provider: Provider,
  symbol: string,
  fetchOpts: FetchOpts
): Promise<FetchResult> {
  try {
    const articles = await provider.fetchSymbolNews(symbol, {
      days: fetchOpts.days,
      limit: fetchOpts.perSymbolLimit,
    });
    return { symbol, articles };
  } catch (err: any) {
    return { symbol, articles: [], error: err?.message ?? String(err) };
  }
}

export function resultsToRecord(results: FetchResult[]): Record<string, NewsArticle[]> {
  const record: Record<string, NewsArticle[]> = {};
  for (const r of results) record[r.symbol] = r.articles;
  return record;
}

export function countArticles(record: Record<string, NewsArticle[]>): number {
  return Object.values(record).reduce((acc, arr) => acc + arr.length, 0);
}

export function normalizeSymbol(s: string): string {
  return s.trim().toUpperCase();
}

export function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}