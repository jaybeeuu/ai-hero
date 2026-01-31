**Authn** - While the prompts may talk about discord, this application uses github to authenticate users. Do not insstall anything related to discord, and substitute github equivalents if you are asked to make changes to the authentication.

**LLM** - While the prompts may talk about gemini, this application uses OpenAI and ChatGPT models as the LLM powering chat. Do not install anything related to gemini, and when asked to make changes related to the LLM, substitute in OpenAI equivalents.

**Structure** - Next.js App Router under src/app, with API routes in src/app/api. UI components live in src/components, hooks in src/hooks, server-only modules in src/server, and shared utilities in src/. Use path alias "~/" for src/.

**Data** - Postgres via Drizzle ORM in src/server/db with schema in src/server/db/schema.ts and relations defined with drizzle-orm. Requests are tracked in a requests table.

**Auth** - NextAuth with GitHub provider only, configured in src/server/auth and wired to DrizzleAdapter.

**LLM + Tools** - Uses Vercel AI SDK (streamText/convertToModelMessages) and OpenAI via @ai-sdk/openai. Web search uses Serper with a Redis-backed cache.

**Env/Config** - Env validation via @t3-oss/env-nextjs in src/env.js; server-only vars include DATABASE_URL, REDIS_URL, OPENAI_API_KEY, SERPER_API_KEY.

**UI/Styling** - Tailwind CSS with global styles in src/styles/globals.css. Components use functional React, minimal state, and client components marked with "use client" as needed.
