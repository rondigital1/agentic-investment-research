import axios from "axios";

const POLYGON_API_KEY = process.env.POLYGON_API_KEY;

if (!POLYGON_API_KEY) {
  // Don’t throw globally if you want local runs without it; you can throw in the caller instead.
  console.warn("POLYGON_API_KEY is not set. Live prices will fail.");
}

export async function fetchPrevClose(symbol: string): Promise<number | null> {
  if (!POLYGON_API_KEY) {
    throw new Error("Missing POLYGON_API_KEY");
  }

  const url = `https://api.polygon.io/v2/aggs/ticker/${symbol}/prev?adjusted=true&apiKey=${POLYGON_API_KEY}`;
  const resp = await axios.get(url, { timeout: 10_000 });

  const bar = resp.data?.results?.[0];
  const close = bar?.c;

  return typeof close === "number" ? close : null;
}