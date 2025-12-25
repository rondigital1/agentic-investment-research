import { Annotation } from "@langchain/langgraph";

export const StateAnnotation = Annotation.Root({
  messages: Annotation<{ role: "user" | "assistant" | "system"; content: string }[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
});

export type SimpleState = typeof StateAnnotation.State;