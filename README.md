A fast, privacy-focused app to search, bookmark, group, and track movies and TV shows. Everything you add is stored locally in your browser — no account required. Export and import your library as a self-contained JSON file.

Features
- Search TMDb for movies and TV shows
- Bookmark items and group related movies into franchises
- Verify IMDb ratings via OMDb (server-side) and fall back to TMDb scores when unavailable
- Estimate watch time for movies and series
- Import/Export your bookmarks as JSON

Tech stack
- React 18 + Vite
- Tailwind CSS + Radix UI primitives
- Express server acting as a small API proxy for TMDb and OMDb
- Axios for HTTP requests

Getting started
1. Install dependencies:

   npm install

2. Start development server:

   npm run dev

Production build

   npm run build
   npm start

This produces a client bundle (dist/spa) and a server build (dist/server/node-build.mjs).

Environment variables (required)
- TMDB_API_KEY — single TMDb API key used for all TMDb requests
- OMDB_API_KEY_1, OMDB_API_KEY_2, OMDB_API_KEY_3, OMDB_API_KEY_4, OMDB_API_KEY_5 — OMDb keys used only to fetch IMDb ratings. The server will rotate through these keys when a key fails or is rate-limited.

Note: Do not commit secrets. For development you may add these to a local .env file (this project reads .env for convenience), but keep that file out of version control.

Server API endpoints
- GET /health
- GET /api/ping
- GET /api/search/movies?query=&page=
- GET /api/search/tv?query=&page=
- GET /api/movie/:id
- GET /api/tv/:id (supports minimal mode)
- GET /api/tv/:id/season/:season
- GET /api/imdb-rating?title=&year=&imdbId=  (returns { imdbRating })
- GET /api/trending/movies
- GET /api/trending/tv

How search works (high level)
- Client calls /api/search/movies and /api/search/tv in parallel
- Results are normalized, deduped, ranked (exact title matches, fuzzy similarity, rating, selection boosts), and cached locally per query
- Bookmarks are stored locally and excluded from add suggestions (but visible in search results as "Added")

OMDb usage
- OMDb is used only to verify IMDb ratings. The server proxies OMDb requests and rotates through OMDB_API_KEY_1..5 when a key is rejected or rate-limited. Only the IMDb rating string is returned to the client.

Data & storage
- Bookmarks are stored in localStorage under the key onlyseries-bookmarks
- UI state (filters, sort, selection) is stored under onlyseries-ui-v1

Troubleshooting
- If items are missing from search: confirm server can reach TMDb (check TMDB_API_KEY) and clear localStorage if stale bookmarks are blocking results.
- If IMDb ratings are missing: ensure OMDb keys are configured and not exhausted. The app falls back to TMDb ratings when OMDb is unavailable.

Contributing
- Follow existing component patterns and Tailwind conventions
- Keep secrets out of the repository; use the server proxy for all third‑party API calls

License & contact
- This project is provided as-is. For questions or issues open an issue in the repository.

Vercel deployment
- Recommended approach: deploy the client as a static site and host the server API as serverless functions or a separate service. Vercel does not run long-lived Node servers; use serverless functions (api/*) or an external server for the Express API.

Quick steps to deploy on Vercel (static client + serverless API):
1. Build command: npm run build
2. Output directory: dist/spa
3. Install command: npm install
4. Add the required Environment Variables in the Vercel project settings:
   - TMDB_API_KEY
   - OMDB_API_KEY_1
   - OMDB_API_KEY_2
   - OMDB_API_KEY_3
   - OMDB_API_KEY_4
   - OMDB_API_KEY_5
   Note: add the same values you use locally; keep these secret.

If you prefer deploying both client + Express API on Vercel:
- Move or reimplement server routes as serverless functions under api/ (for example api/imdb-rating.js, api/search/movies.js). Each file should export a handler(req, res) and call the existing server logic. Alternatively, host the Express server elsewhere (Heroku, Fly, Render, or a Neon-backed serverless endpoint) and point the client to that API.

Vercel project settings screenshot hints:
- Root Directory: ./
- Build Command: npm run build
- Output Directory: dist/spa
- Install Command: npm install

Troubleshooting on Vercel
- If API endpoints return 404: ensure API routes are placed under api/ as serverless functions or the client is configured to call your external server URL.
- If environment variables are missing: add them in Project Settings > Environment Variables and redeploy.
- If you need long-running server behavior, deploy the Express server to a platform that supports persistent Node processes and set the client to use that API URL.

Need help converting server routes to Vercel serverless functions? I can convert the existing Express routes into api/* functions and wire environment variables; tell me to proceed and I will create the serverless endpoints in the repository.

<!-- Vercel helpers: the project now includes api/* serverless wrappers to allow deploying the existing Express-based proxy on Vercel. If you prefer the original Express server, host it externally and set the client to use that API URL. -->
