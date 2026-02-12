import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  test: {
    provide: {
      cwd: process.cwd(),
    },
    setupFiles: ["dotenv/config"],
    testTimeout: 120000,
  },
  plugins: [tsconfigPaths()],
});
