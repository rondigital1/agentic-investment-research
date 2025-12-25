import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";
import type { ExplainState } from "../types/portfolio";

const model = new ChatOpenAI({
  modelName: "gpt-4.1-mini",
  temperature: 0.4,
  maxTokens: 500,
});

export async function diversificationAgent(state: ExplainState): Promise<ExplainState> {
  if (!state.stats) {
    throw new Error("Stats missing. Run statsAgent first.");
  }

  const { stats, riskLevel, riskFactors } = state;

  const systemPrompt = `You are a portfolio diversification analyst. Follow these rules:
  1. NEVER give direct buy/sell instructions
  2. Suggest educational scenarios and example tickers
  3. Tailor suggestions to risk level (HIGH/MEDIUM/LOW)
  4. Keep output to 6-10 bullets max
  5. Use markdown with clear headings`;

  const userPrompt = `Risk Level: ${riskLevel}
  Risk Factors: ${riskFactors?.join("; ") || "none"}

  Portfolio Stats:
  \`\`\`json
  ${JSON.stringify(stats, null, 2)}
  \`\`\`

  Provide diversification ideas in markdown with these sections:
  ## Reduce Concentration
  ## Add Defensive Balance  
  ## Diversify by Region/Factor
  ## Optional Growth Satellites (if appropriate)`;

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  const res = await model.invoke(messages);

  return {
    ...state,
    diversificationIdeas: String(res.content),
  };
}