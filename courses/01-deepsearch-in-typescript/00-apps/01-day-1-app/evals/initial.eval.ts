import { evalite } from "evalite";
import type { ModelMessage } from "ai";
import { askDeepSearch } from "~/deep-search";

evalite("Deep Search Eval", {
  data: async (): Promise<{ input: ModelMessage[] }[]> => {
    return [
      {
        input: [
          {
            role: "user",
            content: "What is the latest version of TypeScript?",
          },
        ],
      },
      {
        input: [
          {
            role: "user",
            content: "What are the main features of Next.js 15?",
          },
        ],
      },
    ];
  },
  task: async (input) => {
    const result = await askDeepSearch(input);
    console.log("Deep Search Result:", { input, result });
    return result;
  },
  scorers: [
    {
      name: "Contains Links",
      description: "Checks if the output contains any markdown links.",
      scorer: ({ output }) => {
        const containsLinks = /\[[^\]]+\]\([^\)]+\)/.test(output ?? "");

        return containsLinks ? 1 : 0;
      },
    },
  ],
});
