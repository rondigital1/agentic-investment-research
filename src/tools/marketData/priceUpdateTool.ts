import type { Holding } from "../../types/portfolio";
import { fetchPrevClose } from "./polygonClient";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function updateHoldingsPrices(
  holdings: Holding[],
  opts?: { delayMs?: number }
): Promise<Holding[]> {
  const delayMs = opts?.delayMs ?? 250; // helps avoid rate-limit on free tier

  const out: Holding[] = [];
  for (const h of holdings) {
    // skip cash-like
    if (h.assetClass === "CASH" || h.symbol === "SPAXX") {
      out.push(h);
      continue;
    }

    let price = h.price;
    try {
      const close = await fetchPrevClose(h.symbol);
      if (close != null) price = close;
    } catch {
      // keep existing price if API fails
    }

    out.push({ ...h, price });
    await sleep(delayMs);
  }
  return out;
}