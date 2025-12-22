import { prisma } from "../prisma";

export async function ensureUser(userId: string) {
  return prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: { id: userId },
  });
}