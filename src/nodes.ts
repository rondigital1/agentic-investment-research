import { ChatOpenAI } from "@langchain/openai";
import { SimpleState } from "./state";

const model = new ChatOpenAI({
  modelName: "gpt-4.1-mini",
  temperature: 0,
});

export async function singleAgentNode(state: SimpleState): Promise<SimpleState> {
  const res = await model.invoke(state.messages);

  return {
    ...state,
    messages: [...state.messages, { role: "assistant", content: String(res.content) }],
  };
}