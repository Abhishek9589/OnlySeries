import path from "path";
import { fileURLToPath } from 'url';
import { createServer } from "./index.js";
import express from "express";

const app = createServer();
const port = process.env.PORT || 3000;

// In production, serve the built SPA files
const distPath = path.join(process.cwd(), "dist/spa");

// Serve static files
app.use(express.static(distPath));

// Handle SPA routing - serve index.html for all non-API routes
app.use((req, res, next) => {
  // Skip API routes and health check
  if (req.path.startsWith("/api/") || req.path.startsWith("/health")) {
    return next();
  }

  // Serve index.html for all other routes
  res.sendFile(path.join(distPath, "index.html"));
});

// 404 handler for API routes
app.use("/api/*", (req, res) => {
  res.status(404).json({ error: "API endpoint not found" });
});

app.listen(port, "0.0.0.0", () => {
  console.log(`🚀 Fusion Starter server running on port ${port}`);
  console.log(`📱 Frontend: http://localhost:${port}`);
  console.log(`🔧 API: http://localhost:${port}/api`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("🛑 Received SIGTERM, shutting down gracefully");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("🛑 Received SIGINT, shutting down gracefully");
  process.exit(0);
});
