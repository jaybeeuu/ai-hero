import { createScorer, evalite } from "evalite";
import { generateObject } from "ai";
import { z } from "zod";
import { askDeepSearch } from "~/deep-search";
import { factualityModel } from "~/model";

const checkFactuality = async (opts: {
  question: string;
  groundTruth: string;
  submission: string;
}) => {
  const { object } = await generateObject({
    model: factualityModel,
    prompt: `
You are comparing a submitted answer to an expert answer on a given question. Here is the data:
[BEGIN DATA]
************
[Question]: ${opts.question}
************
[Expert]: ${opts.groundTruth}
************
[Submission]: ${opts.submission}
************
[END DATA]

Compare the factual content of the submitted answer with the expert answer. Ignore any differences in style, grammar, or punctuation.
The submitted answer may either be a subset or superset of the expert answer, or it may conflict with it. Determine which case applies. Answer the question by selecting one of the following options:
(A) The submitted answer is a subset of the expert answer and is fully consistent with it.
(B) The submitted answer is a superset of the expert answer and is fully consistent with it.
(C) The submitted answer contains all the same details as the expert answer.
(D) There is a disagreement between the submitted answer and the expert answer.
(E) The answers differ, but these differences don't matter from the perspective of factuality.
`,
    schema: z.object({
      answer: z.enum(["A", "B", "C", "D", "E"]),
      rationale: z.string(),
    }),
  });

  const scores = {
    A: 0.4,
    B: 0.6,
    C: 1,
    D: 0,
    E: 1,
  } as const;

  return {
    score: scores[object.answer],
    metadata: {
      rationale: object.rationale,
    },
  };
};

const Factuality = createScorer<string, string, string>({
  name: "Factuality",
  scorer: async ({ input, expected, output }) => {
    return checkFactuality({
      question: input,
      groundTruth: expected ?? "",
      submission: output,
    });
  },
});

evalite("Deep Search Eval", {
  data: async (): Promise<{ input: string; expected: string }[]> => {
    return [
      {
        input: "What is the latest version of TypeScript?",
        expected: "The current TypeScript version is 5.8.",
      },
      {
        input: "What are the main features of Next.js 15?",
        expected: [
          "@next/codemod CLI to upgrade Next.js and React versions.",
          "Async Request APIs as a breaking step toward simpler rendering and caching.",
          "Caching semantics change so fetch, GET handlers, and client navigation are not cached by default.",
          "React 19 support, including React Compiler and hydration improvements.",
          "Turbopack dev mode stable with performance improvements.",
          "Static indicator for routes during development.",
          "unstable_after API for work after streaming completes.",
          "instrumentation.js API stable for server lifecycle observability.",
          "Enhanced forms via next/form.",
          "TypeScript support for next.config.ts.",
          "Self-hosting improvements with more Cache-Control control.",
          "Server Actions security improvements.",
          "Bundling external packages configuration for App and Pages Router.",
          "ESLint 9 support.",
          "Development and build performance improvements.",
        ].join("\n"),
      },
    ];
  },
  task: async (input) => {
    const result = await askDeepSearch([
      {
        role: "user",
        content: input,
      },
    ]);
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
    Factuality,
  ],
  columns: async ({ input, expected }) => {
    return [
      { label: "Question", value: input },
      { label: "Expected", value: expected ?? "" },
    ];
  },
});
