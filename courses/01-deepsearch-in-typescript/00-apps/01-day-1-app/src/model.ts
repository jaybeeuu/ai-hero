import { openai } from "@ai-sdk/openai";

export const model = openai("gpt-4o-mini");
export const factualityModel = openai("gpt-4o-mini");