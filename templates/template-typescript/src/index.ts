import { assistant, open } from "@mixlayer/llm";
import SYSTEM_PROMPT from "./system.txt";
import BANNER from "./banner.txt";

// a simple chat bot
export default async function main(request: any) {
  // @ts-ignore
  if (process.env.MIXLAYER_ENV === "development") {
    console.log(BANNER);
  }

  // open a context window on the default model
  const seq = await open();

  // check for the existence of the messages param, respond
  // with a message if it doesn't exist
  if (!request?.params?.messages || !Array.isArray(request.params.messages)) {
    console.log("no messages provided, responding with a greeting");

    await seq.append(
      "The user didn't say anything. Please ask them to provide a message.",
      { role: "system", hidden: true }
    );

    console.log("generating a reply");

    await assistant(seq).gen({ temperature: 0.4 });

    console.log("execution finished");

    return;
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
