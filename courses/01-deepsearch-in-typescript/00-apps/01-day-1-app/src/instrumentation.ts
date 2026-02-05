import { LangfuseSpanProcessor } from "@langfuse/otel";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";

export function register() {
  const tracerProvider = new NodeTracerProvider({
    spanProcessors: [new LangfuseSpanProcessor()],
  });

  tracerProvider.register();
}
