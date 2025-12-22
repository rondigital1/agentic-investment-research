import express from "express";
import { healthRouter } from "./routes/health.routes";
import { portfolioRouter } from "./routes/portfolio.routes";
import { analyzeRouter } from "./routes/analyze.routes";

export function createApp() {
  const app = express();
  app.use(express.json({ limit: "2mb" }));

  app.use("/health", healthRouter);
  app.use("/portfolio", portfolioRouter);
  app.use("/analyze", analyzeRouter);
  app.use("/research", analyzeRouter);

  return app;
}