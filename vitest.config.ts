import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    environment: "jsdom",
    execArgv:
      Number(process.versions.node.split(".")[0]) >= 25
        ? ["--no-webstorage"]
        : [],
    setupFiles: ["./src/test/setup.ts"],
    clearMocks: true,
    exclude: ["e2e/**", "node_modules/**"],
  },
});
