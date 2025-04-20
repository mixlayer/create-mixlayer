import { Hono } from "hono";
import { logger } from "hono/logger";
import { stream, streamSSE } from "hono/streaming";
import { user, assistant, open } from "@mixlayer/llm";

const app = new Hono();

app.use(logger());

const MATH_TOOL = {
  name: "calculator",
  description: "Evaluate mathematical expressions",
  fn: ({ expression }: { expression: string }) => {
    return { answer: eval(expression) };
  },
  parameters: {
    expression: {
      param_type: "string",
      description: "Math problem to evaluate",
      required: true,
    },
  },
};

app.get("/dru", async (c) => {
  const seq = await open();
  await user(seq).append("What is etymology of the name Dru?\n");
  const out = await assistant(seq)
    .gen({ temperature: 0.2, stopAt: ["\n"] })
    .text();
  return c.text(out);
});

app.get("/textGen", async (c) => {
  return stream(c, async (stream) => {
    const seq = await open();
    await user(seq).append("What is the meaning of Miguel?\n");
    await stream.pipe(await assistant(seq).gen().textStream());
  });
});

app.get("/api/hello", (c) => {
  return c.json({
    ok: true,
    message: "Hello World!",
  });
});

app.get("/hello/:name", (c) => {
  const { name } = c.req.param();
  return c.text(`Hello, ${name}!`);
});

app.get("/boom", (c) => {
  throw new Error("hello source maps");
});

app.get("/stream", (c) => {
  return stream(c, async (stream) => {
    for (let i = 0; i < 10; i++) {
      await stream.writeln(`Hello, ${i}!`);
      await stream.sleep(250);
    }
  });
});

app.get("/stream3", (c) => {
  //@ts-ignore
  let stream = test_js_stream();
  return new Response(stream);
});

app.get("/stream2", (c) => {
  let stream = new ReadableStream({
    start(controller) {
      console.log("start");
      controller.enqueue("Hello\n");
    },

    async pull(controller) {
      console.log("pull");
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode("<MESSAGE>\n"));
      controller.close();
    },

    cancel() {
      console.log("cancel");
    },
  });

  return new Response(stream);
});

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
