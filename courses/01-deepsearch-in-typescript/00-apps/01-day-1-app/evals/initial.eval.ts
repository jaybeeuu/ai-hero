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
      {
        input: [
          {
            role: "user",
            content: "What is the latest stable release of Node.js?",
          },
        ],
      },
      {
        input: [
          {
            role: "user",
            content: "Summarize the key changes in React 19.",
          },
        ],
      },
      {
        input: [
          {
            role: "user",
            content: "What are the main features of PostgreSQL 16?",
          },
        ],
      },
      {
        input: [
          {
            role: "user",
            content: "What is the current version of Vite?",
          },
        ],
      },
      {
        input: [
          {
            role: "user",
            content: "What is the current version of Tailwind CSS?",
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
