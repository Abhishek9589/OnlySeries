import { } from '../server/index.js';

export default function handler(req, res) {
  // Simple health endpoint
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
}
