import { parse } from "csv-parse/sync";
import { z } from "zod";
import { prisma } from "./prisma";

export type HoldingInput = {
  symbol: string;
  shares: number;
  price?: number;
  assetClass?: string;
};

const HoldingSchema = z.object({
  symbol: z.string().min(1),
  shares: z.number().finite(),
  price: z.number().finite().optional(),
  assetClass: z.string().optional(),
});

export function parseHoldingsCsv(csvText: string): HoldingInput[] {
  const records = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, string>[];

  const holdings = records.map((r) => {
    const symbol = (r.symbol ?? r.Symbol ?? "").trim().toUpperCase();
    const shares = Number(r.shares ?? r.Shares ?? "");
    const priceRaw = r.price ?? r.Price;
    const assetClass =
      (r.assetClass ?? r.AssetClass ?? r["asset_class"] ?? "").trim() || undefined;

    const price =
      priceRaw == null || priceRaw === "" ? undefined : Number(priceRaw);

    const parsed = HoldingSchema.safeParse({ symbol, shares, price, assetClass });
    if (!parsed.success) {
      throw new Error(`Invalid CSV row for ${symbol}: ${parsed.error.message}`);
    }
    return parsed.data;
  });

  if (holdings.length === 0) throw new Error("CSV produced 0 holdings");
  return holdings;
}

export async function saveSnapshot(userId: string, source: string, holdings: HoldingInput[]) {
  const snap = await prisma.portfolioSnapshot.create({
    data: {
      userId,
      source,
      holdings: {
        create: holdings.map((h) => ({
          symbol: h.symbol,
          shares: h.shares,
          price: h.price ?? null,
          assetClass: h.assetClass ?? null,
        })),
      },
    },
    select: { id: true, createdAt: true },
  });

  return snap;
}

export async function getLatestHoldings(userId: string) {
  const snap = await prisma.portfolioSnapshot.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      createdAt: true,
      holdings: {
        select: { symbol: true, shares: true, price: true, assetClass: true },
      },
    },
  });

  if (!snap) return null;

  return {
    snapshotId: snap.id,
    createdAt: snap.createdAt,
    holdings: snap.holdings.map((h) => ({
      symbol: h.symbol,
      shares: h.shares,
      price: h.price ?? undefined,
      assetClass: h.assetClass ?? undefined,
    })),
  };
}