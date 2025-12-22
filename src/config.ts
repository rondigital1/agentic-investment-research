export const config = {
  useLivePrices: process.env.USE_LIVE_PRICES === "true",
  provider: (process.env.MARKET_DATA_PROVIDER ?? "polygon") as "polygon",
  logRuns: process.env.LOG_RUNS === "true",
};