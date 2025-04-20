import { Hono } from "hono";
import { logger } from "hono/logger";
import { streamSSE } from "hono/streaming";
import { assistant, open } from "@mixlayer/llm";

const app = new Hono();

app.use(logger());

app.post("/chat", async (c) => {
  const body = await c.req.json<ChatRequest>();

  return streamSSE(c, async (stream) => {
    const seq = await open();

    for (const message of body.params.messages) {
      await seq.append(message.text, { role: message.role });
    }

    const response = await assistant(seq)
      .gen({ temperature: 0.8 })
      .textStream();
    let reader = response.getReader();

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      await stream.writeSSE({
        data: JSON.stringify({ text: value }),
      });
    }

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
