import { trendingMovies } from '../../server/routes/tmdb-proxy.js';

export default async function handler(req, res) {
  try {
    await trendingMovies(req, res);
  } catch (err) {
    console.error('trending/movies wrapper error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
