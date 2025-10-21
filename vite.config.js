import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { createServer } from "./server/index.js";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  root: "client",
  server: {
    host: "::",
    port: 8080,
    fs: {
      allow: [path.resolve(process.cwd(), "client"), path.resolve(process.cwd(), "shared")],
      deny: [".env", ".env.*", "*.{crt,pem}", "**/.git/**", path.resolve(process.cwd(), "server") + "/**"],
    },
  },
  build: {
    outDir: path.resolve(process.cwd(), "dist/spa"),
  },
  publicDir: "public",
  plugins: [react(), expressPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "./client"),
      "@shared": path.resolve(process.cwd(), "./shared"),
    },
  },
}));

function expressPlugin() {
  return {
    name: "express-plugin",
    apply: "serve", // Only apply during development (serve mode)
    configureServer(server) {
      const app = createServer();

      // Add Express app as middleware to Vite dev server
      server.middlewares.use(app);
    },
  };
}
