import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "./index.js";
import express from "express";

const app = createServer();
const port = process.env.PORT || 3000;

// In production, serve the built SPA files
// Get the directory of the built server file, then go up to reach dist/spa
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
let distPath = path.resolve(__dirname, "../spa");
<<<<<<< HEAD

// Handle Vite build quirk where import.meta.url includes /src/ prefix
if (distPath.includes('/src/dist/spa')) {
  distPath = distPath.replace('/src/dist/spa', '/dist/spa');
}
=======
>>>>>>> 5d70811e9aacbb54b3492c6757caa6c761f99551

// Handle Vite build quirk where import.meta.url includes /src/ prefix
if (distPath.includes('/src/dist/spa')) {
  distPath = distPath.replace('/src/dist/spa', '/dist/spa');
}

// Check if distPath exists
import { existsSync, readdirSync } from "fs";
if (existsSync(distPath)) {
  console.log(`✅ distPath exists. Contents: ${readdirSync(distPath).join(', ')}`);
} else {
  console.log(`❌ distPath does not exist!`);
  console.log(`📂 Parent directory: ${path.dirname(distPath)}`);
  console.log(`📂 Parent contents: ${existsSync(path.dirname(distPath)) ? readdirSync(path.dirname(distPath)).join(', ') : 'N/A'}`);
}

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
