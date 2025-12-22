import {
  StateGraph,
  START,
  END,
  Annotation,
} from "@langchain/langgraph";
import type { ExplainState } from "../types/portfolio";
import { statsAgent } from "../agents/statsAgent";
import { riskAgent } from "../agents/riskAgent";
import { explainerAgent } from "../agents/explainerAgent";
import { warningAgent } from "../agents/warningAgent";
import { priceUpdateAgent } from "../agents/priceUpdateAgent";
import { diversificationAgent } from "../agents/diversificationAgent";
import { deepResearchAgent } from "../agents/deepResearchAgent";
import { diversifierCandidatesAgent } from "../agents/diversifierCandidatesAgent";

// 1) Define the graph state using Annotation.Root
const ExplainAnnotation = Annotation.Root({
  warning: Annotation<ExplainState["warning"]>(),
  holdings: Annotation<ExplainState["holdings"]>(),
  stats: Annotation<ExplainState["stats"]>(),
  explanation: Annotation<ExplainState["explanation"]>(),
  riskLevel: Annotation<ExplainState["riskLevel"]>(),
  riskFactors: Annotation<ExplainState["riskFactors"]>(),
  diversificationIdeas: Annotation<ExplainState["diversificationIdeas"]>(),
  useLivePrices: Annotation<ExplainState["useLivePrices"]>(),
  researchBrief: Annotation<ExplainState["researchBrief"]>(),
  diversifierCandidates: Annotation<ExplainState["diversifierCandidates"]>(),
});

// This is the actual state type inside the graph
type GraphState = typeof ExplainAnnotation.State;

// 2) Nodes just return *partial* state updates
async function statsNode(state: GraphState): Promise<Partial<GraphState>> {
  // statsAgent should accept something shaped like ExplainState
  const updated = statsAgent(state as unknown as ExplainState);
  return { stats: updated.stats };
}

async function riskNode(state: GraphState): Promise<Partial<GraphState>> {
  const updated = riskAgent(state as unknown as ExplainState);
  return {
    riskLevel: updated.riskLevel,
    riskFactors: updated.riskFactors,
  };
}

async function deepResearchNode(state: GraphState): Promise<Partial<GraphState>> {
  const updated = await deepResearchAgent(state as unknown as ExplainState);
  return { researchBrief: updated.researchBrief };
}

async function diversifierCandidatesNode(state: GraphState): Promise<Partial<GraphState>> {
  const updated = await diversifierCandidatesAgent(state as unknown as ExplainState);
  return { diversifierCandidates: updated.diversifierCandidates };
}

async function explainerNode(state: GraphState): Promise<Partial<GraphState>> {
  const updated = await explainerAgent(state as unknown as ExplainState);
  return { explanation: updated.explanation };
}

async function diversificationNode(state: GraphState): Promise<Partial<GraphState>> {
  const updated = await diversificationAgent(state as unknown as ExplainState);
  return { diversificationIdeas: updated.diversificationIdeas };
}

async function warningNode(state: GraphState): Promise<Partial<GraphState>> {
  const updated = await warningAgent(state as unknown as ExplainState);
  return { warning: updated.warning };
}

async function priceUpdateNode(state: GraphState): Promise<Partial<GraphState>> {
  if (state.useLivePrices === false) {
    return {}; // no update
  }
  const updated = await priceUpdateAgent(state as unknown as ExplainState);
  return { holdings: updated.holdings };
}

// 3) Build & export compiled graph
export function buildPortfolioExplainerGraph() {
  const workflow = new StateGraph(ExplainAnnotation)
    .addNode("priceUpdate", priceUpdateNode)
    .addNode("statsNode", statsNode)
    .addNode("risk", riskNode)
    .addNode("deepResearch", deepResearchNode)
    .addNode("diversifierCandidates", diversifierCandidatesNode)
    .addNode("diversification", diversificationNode)
    .addNode("warningNode", warningNode)
    .addNode("explain", explainerNode)
    .addEdge(START, "priceUpdate")
    .addEdge("priceUpdate", "statsNode")
    .addEdge("statsNode", "risk")
    .addEdge("risk", "diversifierCandidates")
    .addEdge("diversifierCandidates", "deepResearch")
    .addEdge("deepResearch", "diversification")
    .addConditionalEdges("diversification", async (state) => {
      return state.riskLevel === "HIGH" ? "warning" : "explain";
    }, {
      warning: "warningNode",
      explain: "explain",
    })
    .addEdge("warningNode", "explain")
    .addEdge("explain", END);

  return workflow.compile();
}