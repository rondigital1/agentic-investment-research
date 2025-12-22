import { Prisma, ResearchReport } from "@prisma/client";
import { prisma } from "../prisma";

const RUN_TYPE = {
  WEEKLY: "WEEKLY",
  MANUAL: "MANUAL",
  MONTHLY: "MONTHLY"
} as const;

// Extract the type from the RUN_TYPE values
type RunType = typeof RUN_TYPE[keyof typeof RUN_TYPE];

export async function createResearchReport(researchReport: Prisma.ResearchReportCreateInput): Promise<ResearchReport> {
  const newResearchReport = await prisma.researchReport.create({
    data: researchReport
  });

  return newResearchReport;
}