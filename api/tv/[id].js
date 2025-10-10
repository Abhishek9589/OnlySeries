import { getTVDetails } from '../../../server/routes/tmdb-proxy.js';

export default async function handler(req, res) {
  req.params = req.params || {};
  req.params.id = req.query.id || req.params?.id;

  try {
    await getTVDetails(req, res);
  } catch (err) {
    console.error('tv/[id] wrapper error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
