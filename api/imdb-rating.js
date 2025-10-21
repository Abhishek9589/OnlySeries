import { getIMDbRating } from '../server/routes/tmdb-proxy.js';

export default async function handler(req, res) {
  try {
    await getIMDbRating(req, res);
  } catch (err) {
    console.error('imdb-rating wrapper error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
