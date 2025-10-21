import { trendingTV } from '../../server/routes/tmdb-proxy.js';

export default async function handler(req, res) {
  try {
    await trendingTV(req, res);
  } catch (err) {
    console.error('trending/tv wrapper error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
