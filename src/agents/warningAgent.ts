import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";
import { ExplainState } from "../types/portfolio";

const warnModel = new ChatOpenAI({
  modelName: "gpt-4.1-mini",
  temperature: 0.2,
  maxTokens: 200,
});

export async function warningAgent(state: ExplainState): Promise<ExplainState> {
  const { riskLevel, riskFactors } = state;

  // Defensive: if no risk info, do nothing
  if (!riskLevel || !riskFactors || riskFactors.length === 0) {
    return state;
  }

  const prompt = `
You are a cautious portfolio risk explainer.

The portfolio has riskLevel: ${riskLevel}.
Risk factors:
${riskFactors.map((f) => "- " + f).join("\n")}

Write a short, direct warning in 2–3 sentences:
- Explain why these factors might be risky in practical terms.
- Do NOT give specific trade instructions.
- Talk like you're explaining to a smart friend who doesn't know finance jargon.
  `.trim();

  const res = await warnModel.invoke(prompt);
  const warning = String(res.content);

  return {
    ...state,
    warning,
  };
}