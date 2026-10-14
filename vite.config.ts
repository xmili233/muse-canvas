import { defineConfig } from "vite";
import { apiHandler } from "./server/agent.mjs";

export default defineConfig({
  plugins: [
    {
      name: "muse-agent-api",
      configureServer(server) {
        server.middlewares.use(apiHandler);
      },
      configurePreviewServer(server) {
        server.middlewares.use(apiHandler);
      },
    },
  ],
  server: { port: 5173 },
});
