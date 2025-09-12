import { createServer } from "../server/index.js";

// Initialize Express app once per serverless instance
const app = createServer();

export default function handler(req, res) {
  // Delegate all /api/* requests to our Express app
  return app(req, res);
}
