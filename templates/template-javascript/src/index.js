import { assistant, open } from "@mixlayer/llm";
import SYSTEM_PROMPT from "./system.txt";

// a simple chat bot
export default async function main(request) {
  // open a context window on the default model
  const seq = await open();

  // check for the existence of the messages param
  if (!request?.params?.messages || !Array.isArray(request.params.messages)) {
    throw new Error("messages param must be an array");
  }

  // prepend the system prompt to the messages
  const messages = [
    { role: "system", text: SYSTEM_PROMPT },
    ...request.params.messages,
  ];

  // append each message to the context window
  for (const message of messages) {
    await seq.append(message.text, {
      role: message.role,
      hidden: true,
    });
  }

  // generate a reply from the model
  await assistant(seq).gen({ temperature: 0.2 });
}
