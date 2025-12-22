import { prisma } from "../prisma";

export type HoldingInput = {
  symbol: string;
  shares: number;
  price?: number;
  assetClass?: string;
};

export async function createSnapshot(
  userId: string,
  source: string,
  holdings: HoldingInput[]
) {
  return prisma.portfolioSnapshot.create({
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
}

export async function getLatestSnapshot(userId: string) {
  return prisma.portfolioSnapshot.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      createdAt: true,
      holdings: {
        select: {
          symbol: true,
          shares: true,
          price: true,
          assetClass: true,
        },
      },
    },
  });
}

export async function getLatestTwoSnapshots(userId: string) {
  return prisma.portfolioSnapshot.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 2,
    select: {
      id: true,
      createdAt: true,
      holdings: {
        select: {
          symbol: true,
          shares: true,
          price: true,
          assetClass: true,
        },
      },
    },
  });
}