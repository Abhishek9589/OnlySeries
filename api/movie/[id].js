import { getMovieDetails } from '../../../server/routes/tmdb-proxy.js';

export default async function handler(req, res) {
  // Vercel populates path params in req.query for dynamic routes
  req.params = req.params || {};
  req.params.id = req.query.id || req.query?.id || req.params?.id;

  try {
    await getMovieDetails(req, res);
  } catch (err) {
    console.error('movie/[id] wrapper error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
