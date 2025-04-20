import { Hono } from "hono";
import { logger } from "hono/logger";
import { streamSSE } from "hono/streaming";
import { assistant, open } from "@mixlayer/llm";
import SYSTEM_PROMPT from "./system.txt";

const app = new Hono();

// enable hono logger
app.use(logger());

app.post("/chat", async (c) => {
  const body = await c.req.json<ChatRequest>();

  return streamSSE(c, async (stream) => {
    // open a context window on the default model
    const seq = await open();

    // append the system prompt to the context window
    seq.append(SYSTEM_PROMPT, { role: "system" });

    // append the conversation history to the context window
    for (const message of body.params.messages) {
      await seq.append(message.text, { role: message.role });
    }

    // generate a response from the model
    const response = await assistant(seq)
      .gen({ temperature: 0.8 })
      .textStream();

    let reader = response.getReader();

    // stream the response to the client via SSE
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      await stream.writeSSE({
        data: JSON.stringify({ text: value }),
      });
    }

    // write the done frame so the client knows we're finished
    await stream.writeSSE({
      data: JSON.stringify({ done: true }),
    });
  });
});

interface ChatRequest {
  params: {
    messages: {
      role: "user" | "assistant";
      text: string;
    }[];
  };
}

export default app;
