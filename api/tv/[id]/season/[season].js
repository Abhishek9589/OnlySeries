import { getTVSeason } from '../../../../server/routes/tmdb-proxy.js';

export default async function handler(req, res) {
  req.params = req.params || {};
  // Vercel places dynamic segments in req.query
  req.params.id = req.query.id || req.params?.id;
  req.params.season = req.query.season || req.params?.season;

  try {
    await getTVSeason(req, res);
  } catch (err) {
    console.error('tv/[id]/season/[season] wrapper error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
