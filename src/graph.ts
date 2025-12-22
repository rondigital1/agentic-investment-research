import { StateGraph } from "@langchain/langgraph";
import { StateAnnotation } from "./state";
import { singleAgentNode } from "./nodes";

export function buildGraph() {
  const graph = new StateGraph(StateAnnotation)
    .addNode("agent", singleAgentNode)
    .addEdge("__start__", "agent")
    .addEdge("agent", "__end__");

  return graph.compile();
}