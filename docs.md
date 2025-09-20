This document describes the architecture, flows, and configuration for the project.

Architecture
- Client: React 18 app built with Vite and Tailwind. Components live under `client/components`, pages under `client/pages`.
- Server: Express app that proxies TMDb and OMDb and exposes a small set of API endpoints used by the client.
- Storage: User library and UI preferences are stored locally in the browser (localStorage / IndexedDB fallback).

Core flows
1) Search
- The client calls `/api/search/movies` and `/api/search/tv` in parallel.
- Results are normalized into a unified shape (id, title, type, poster, year, imdbRating, runtime/seasons/episodes) and ranked by:
  - exact-title matches (highest priority)
  - fuzzy similarity (word match ratio)
  - verified rating (IMDb via OMDb or TMDb vote_average)
  - selection boosts (user interaction history)
- Results are cached per query in localStorage for a short TTL to speed up subsequent searches.

2) Bookmarking & enrichment
- Adding an item stores a bookmark object: { id, type, title, year, poster, imdbRating, runtime/episodes, watchStatus, franchise?, addedAt } into localStorage key `onlyseries-bookmarks`.
- On load, the server/client enriches bookmarks for missing runtimes, episode counts, and IMDb ratings using TMDb details and the OMDb proxy.

3) Ratings
- OMDb is used only to fetch/verify IMDb ratings. The server reads OMDb keys from OMDB_API_KEY_1..OMDB_API_KEY_5 and rotates through them when a key is rejected or rate-limited.
- If OMDb cannot return a rating, the client falls back to TMDb's vote_average.

Server endpoints
- GET /health
- GET /api/ping
- GET /api/search/movies?query=&page=
- GET /api/search/tv?query=&page=
- GET /api/movie/:id
- GET /api/tv/:id (supports minimal mode)
- GET /api/tv/:id/season/:season
- GET /api/imdb-rating?title=&year=&imdbId=  -> returns { imdbRating }
- GET /api/trending/movies
- GET /api/trending/tv

Configuration
- Required environment variables for the server process:
  - TMDB_API_KEY (single key for TMDb)
  - OMDB_API_KEY_1..OMDB_API_KEY_5 (OMDb keys used for IMDb verification)
- Development convenience: put these keys in a local .env file (do not commit it).

Operational notes
- The server rotates OMDb keys automatically when encountering 401/403/429 responses. Only the IMDb rating is returned to the client.
- TMDb requests are made with TMDB_API_KEY and should not be exposed to the browser.

Troubleshooting
- Search returns no results: verify TMDB_API_KEY is set and the server has outbound network access to api.themoviedb.org.
- IMDb ratings missing: verify OMDb keys are configured and not exhausted. OMDb call failures fall back to TMDb vote averages.
- To reset the local app state: clear localStorage keys `onlyseries-bookmarks`, `onlyseries-ui-v1`, `searchCacheV2` and delete the IndexedDB database `onlyseries-db` if present.

Developer guidance
- All third-party API access should go through the server proxy in `server/routes/tmdb-proxy.js`.
- Avoid committing secret keys. Use `process.env` for all keys. The codebase reads .env in development via dotenv.
- Keep components small and focused; follow existing Tailwind and accessibility patterns.
