export const devData = [
  {
    input: "What is the latest version of TypeScript?",
    expected: "The current TypeScript version is 5.9.3, released 2025-10-01.",
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
  {
    input:
      "How does the UK's proposed 'earned settlement' immigration system differ from the EU AI Act's approach to risk assessment, and what does this reveal about regulatory philosophy differences between the UK and EU?",
    expected:
      "The UK's earned settlement system (proposed November 2025) uses a time-adjustment model with a baseline 10-year residence period that can be modified based on individual contributions (economic, character, integration), while the EU AI Act uses a risk-based classification system for AI applications. Both reflect different regulatory philosophies: the UK favors flexible, contribution-based frameworks tailored to individual circumstances, while the EU prefers prescriptive, risk-tiered regulations with clear categorical requirements. This mirrors broader differences - the UK's 'pro-innovation' AI approach relies on existing sectoral regulators rather than comprehensive legislation, while the EU has implemented the detailed AI Act with rules for generative models applying from August 2025.",
  },
  {
    input:
      "Compare the pricing and capabilities of AWS, Azure, and Google Cloud's AI inference services in Q3 2025, then explain how this relates to TypeScript 7's performance improvements for large codebases.",
    expected:
      "In Q3 2025, AWS maintained 32% market share with 20% growth (strongest since 2022), Azure held 22% with 40% growth, and Google Cloud had 11% with 36% growth. All three are using NVIDIA's Dynamo for AI inference optimization. Regarding pricing, cloud providers are competing on multi-model deployment capabilities rather than just model performance. This relates to TypeScript 7 (announced December 2025) as Microsoft is rewriting the TypeScript compiler in Go for better performance - addressing similar infrastructure optimization challenges as cloud providers face with AI workloads. TypeScript 7's faster compilation and reduced memory usage mirrors the efficiency gains cloud providers seek in AI inference.",
  },
  {
    input:
      "What is the connection between the UK's Immigration Skills Charge increase of December 2025, Anthropic's Claude Opus 4.6 cybersecurity capabilities released February 2026, and the UK AI Regulation Bill reintroduced in March 2025?",
    expected:
      "The Immigration Skills Charge increased on 16 December 2025 as part of the UK's strategy to reduce reliance on migrant labour while funding domestic skills training. Claude Opus 4.6, released February 5, 2026, demonstrated advanced cybersecurity capabilities by finding 500+ zero-day vulnerabilities in open-source code. The UK AI Regulation Bill was reintroduced March 4, 2025, proposing an AI Authority and regulatory sandboxes. The connection: these represent different UK government strategies for AI talent and capability - restricting immigration to push domestic skill development while simultaneously trying to attract AI companies through light-touch regulation. The UK's struggle is balancing workforce restrictions with maintaining competitiveness in AI, where companies like Anthropic demonstrate capabilities that require specialized talent.",
  },
  {
    input:
      "How do TypeScript 5.8's --erasableSyntaxOnly flag and Node.js 22.18.0's native TypeScript support relate to AWS's $200 billion capex commitment for 2026, and what does this tell us about infrastructure trends?",
    expected:
      "TypeScript 5.8 (released March 2025) introduced --erasableSyntaxOnly to ensure TypeScript-specific syntax can be safely removed, aligning with Node.js 22.18.0's (released July 31, 2025) experimental support for running TypeScript files directly without transpilation. AWS's $200 billion capex commitment for 2026 (announced February 2026) is predominantly for AI workloads and compute capacity. The connection: both represent infrastructure simplification and optimization trends. Direct TypeScript execution eliminates build steps (reducing developer infrastructure complexity), while AWS's massive investment addresses compute supply constraints for AI workloads. Both reflect a shift from abstraction layers to more direct, efficient execution - whether code or compute.",
  },
  {
    input:
      "What are the implications of the UK's proposed abolition of the ten-year long residence route, combined with the UK government's decision to delay AI legislation until second half 2026, for tech companies hiring foreign AI talent?",
    expected:
      "The UK Home Office consultation (opened November 20, 2025) proposes replacing the five-year settlement route with a merit-based system and abolishing the ten-year long residence route, applying retrospectively. Meanwhile, the UK government announced in June 2025 that AI legislation won't come before second half 2026. For tech companies: they face a paradox - stricter immigration pathways make it harder to attract international AI talent (baseline 10-year residence unless in high-skilled jobs earning over £50,270), but lighter AI regulation makes the UK more attractive than the EU (where the AI Act's rules for generative models apply from August 2025). Companies must weigh 'pro-innovation' regulation against workforce access constraints, potentially favoring EU locations despite heavier AI regulation due to easier talent mobility.",
  },
  {
    input:
      "How does Microsoft's TypeScript 7 rewrite in Go compare to Anthropic's approach with Claude Opus 4.6's multi-agent teams, and what does this reveal about different strategies for handling computational complexity?",
    expected:
      "Microsoft announced in March 2025 that it's rewriting TypeScript in Go (TypeScript 7), moving away from a bootstrapped compiler to achieve better performance. Progress update December 2025 showed near-complete type-checking parity. Anthropic's Claude Opus 4.6 (released February 5, 2026) introduced agent teams for multi-agent collaboration. These represent opposing strategies: Microsoft chose architectural rewrite (changing the foundation) while Anthropic chose architectural expansion (coordinating multiple specialized agents). Microsoft prioritized speed/efficiency through a performance-oriented language, while Anthropic addressed complexity through parallelization and specialization. Both tackle the same problem - handling increasing computational demands - but Microsoft optimized the tool itself while Anthropic created coordination frameworks for multiple tools.",
  },
  {
    input:
      "Connect the UK's 10 Year Health Plan for England published July 2025, Azure's integration of NVIDIA Blackwell platform announced March 2025, and TypeScript 5.9's deferred module evaluation. What pattern emerges?",
    expected:
      "The UK's 10 Year Health Plan (July 2025) focuses on shifting care from hospitals to communities ('left shift'), with £29 billion in NHS spending increases. Azure integrated NVIDIA Blackwell in March 2025 for zero-configuration deployments with AI Foundry. TypeScript 5.9 introduced deferred module evaluation using 'import defer' syntax, allowing modules to load without immediate execution. Pattern: all three represent 'lazy loading' or 'deferred execution' strategies - healthcare services moved closer to where they're needed (not centralized), AI compute provisioned on-demand (not pre-allocated), and code modules evaluated when accessed (not at import). This reflects a broader shift from centralized, upfront resource allocation to distributed, just-in-time delivery across infrastructure, healthcare, and software architecture.",
  },
  {
    input:
      "How do the UK's proposed 100 new towns (announced February 2025), AWS's addition of 4 gigawatts of computing capacity in 2025, and TypeScript's path normalization optimizations in version 5.8 reflect similar infrastructure scaling challenges?",
    expected:
      "The UK government published a list of 100 proposed locations for new towns in February 2025 to address housing supply. AWS added 4 gigawatts of compute capacity in 2025 (double their 2022 capacity when they were an $80B business). TypeScript 5.8 optimized path normalization to avoid array allocations for projects with many files. All three address scaling bottlenecks: physical infrastructure (housing), compute infrastructure (data centers), and software infrastructure (build performance). Each faces similar challenges: the UK struggles with planning regulations and local opposition (162 billion in delayed data center projects as of June 2025), AWS faces power availability constraints, and TypeScript dealt with repetitive operations degrading performance. Solutions involve optimization (TypeScript), massive investment (AWS $200B for 2026), and regulatory reform (UK's National Planning Policy Framework rewrite December 2025).",
  },
  {
    input:
      "Explain how the UK's Employment Rights Act 2025 fire-and-rehire restrictions, Anthropic's commitment to keep Claude ad-free forever, and Azure's Fairwater AI campus design with closed-loop liquid cooling all address trust and sustainability issues.",
    expected:
      "The Employment Rights Act 2025 (royal assent December 2025) makes it automatically unfair to dismiss employees to force contract changes on core terms, protecting worker stability. Anthropic committed (February 2026) to keeping Claude permanently ad-free, arguing ads would undermine trust in AI handling sensitive personal information. Azure's Fairwater AI campuses (Atlanta operational October 2025, Wisconsin early 2026) use closed-loop liquid cooling eliminating operational water consumption. All three address sustainability/trust: employment law prevents exploitative contract manipulation, Anthropic's ad-free pledge prevents exploitative data use, and Azure's cooling design prevents environmental resource exploitation. Each recognizes that short-term optimization (cheaper labor via re-hiring, ad revenue, traditional cooling) undermines long-term value (employee retention, user trust, environmental sustainability).",
  },
];
