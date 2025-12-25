import { z } from "zod";

// Adjust if your Citation type differs.
// Minimal, practical citation shape:
export const CitationSchema = z.object({
  title: z.string().min(1),
  url: z.string().url(),
  publisher: z.string().optional(),
  publishedAt: z.string().optional(), // ISO-ish
});

const SentimentSchema = z.enum(["POSITIVE", "NEUTRAL", "NEGATIVE", "MIXED"]);
const ConfidenceSchema = z.enum(["LOW", "MEDIUM", "HIGH"]);

const BriefItemSchema = z.object({
  symbol: z.string().min(1),
  bullets: z.array(z.string().min(1)).min(1).max(5),
  sentiment: SentimentSchema,
  confidence: ConfidenceSchema,
  citations: z.array(CitationSchema).max(8).default([]),
});

export const ResearchBriefSchema = z.object({
  asOf: z.string().min(1),
  scope: z.object({
    symbols: z.array(z.string().min(1)).min(1).max(20),
    diversifierTickers: z.array(z.string().min(1)).max(20),
    timeWindowDays: z.number().int().min(1).max(365),
    maxSourcesPerSymbol: z.number().int().min(1).max(10),
  }),

  keyThemes: z.array(z.string().min(1)).min(0).max(10),

  symbolBriefs: z.array(BriefItemSchema).max(20),

  holdingsBriefs: z.array(BriefItemSchema).max(10),
  diversifierBriefs: z.array(BriefItemSchema).max(10),

  notableRisks: z.array(z.string().min(1)).min(0).max(10),
  notableOpportunities: z.array(z.string().min(1)).min(0).max(10),

  citations: z.array(CitationSchema).max(50),
});

export type ResearchBrief = z.infer<typeof ResearchBriefSchema>;
export type Citation = z.infer<typeof CitationSchema>;