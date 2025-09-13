# onlyseries.towatch

A fast, privacy‑friendly app to search, bookmark, group, and track movies and TV shows. Everything you add is stored locally in your browser. No account is required. Import and export your list as JSON at any time.

- Search TMDb for movies and series
- Bookmark titles and organize related movies into a franchise
- See verified ratings and runtime details
- Estimate total watch time across your list
- Explore episode scores for series in a compact grid
- Import/Export your library as a JSON file

## Tech stack
- React 18 + Vite
- Tailwind CSS + Radix UI primitives
- Express server as a lightweight API proxy
- Axios for HTTP, GSAP for subtle animations

## Getting started
1. Prerequisites: Node.js 18+ and npm
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```
   This runs Vite for the client and attaches the Express API under the same origin.

### Production build
```bash
npm run build
npm start
```
- Client build: `dist/spa/`
- Server build: `dist/server/` (entry: `dist/server/node-build.mjs`)

## Environment variables
The server proxies TMDb and OMDb and supports automatic key rotation.

- TMDb
  - `TMDB_API_KEY` (or `TMDB_API_KEY_1`, `TMDB_API_KEY_2`, ...)
- OMDb
  - `OMDB_API_KEY_1`, `OMDB_API_KEY_2`, `OMDB_API_KEY_3`, `OMDB_API_KEY_4`, `OMDB_API_KEY_5`

Set at least one valid key for each provider. Keys are never sent to the client.

## API (served by Express)
- `GET /health` – health check
- `GET /api/ping`
- `GET /api/search/movies?query=&page=`
- `GET /api/search/tv?query=&page=`
- `GET /api/movie/:id` – details + external IDs
- `GET /api/tv/:id` – details (+minimal mode)
- `GET /api/tv/:id/season/:season`
- `GET /api/imdb-rating?title=&year=&imdbId=` – OMDb proxy with rotation
- `GET /api/trending/movies`
- `GET /api/trending/tv`

## Folder structure
```
client/           React app and components
  pages/          Top-level views (Index, NotFound)
  components/     UI components, grids, dialogs, episode matrix
  lib/            API wrappers, utilities, caching
server/           Express server and TMDb/OMDb proxy routes
public/           Static assets
```

## Data and privacy
- Your library is stored in `localStorage` under `onlyseries-bookmarks`
- UI preferences are stored under small keys (e.g., `onlyseries-ui-v1`)
- Import/Export produces a self‑contained JSON file

## Key features in detail
- Franchise grouping: select movies and assign a franchise name. Franchise cards are derived from items sharing the same franchise string.
- Ratings: IMDb ratings are verified via the server’s OMDb proxy and cached; TMDb scores are used as a fallback.
- Runtimes: movies fetch runtime from TMDb; series compute episode counts and average runtimes from TMDb details.
- Episode matrix: a responsive grid that displays per‑episode ratings with sticky headers and keyboard/mouse accessibility.

## Deployment notes
Any Node host that can run a Vite‑built static bundle and a small Express server works:
- Build with `npm run build`
- Serve `dist/spa` as static files and run `dist/server/node-build.mjs`
- Provide the environment variables listed above

## Troubleshooting
- Blank or stuck screen after modal actions: reload the page. If developing, ensure overlays are unmounted when dialogs close and that `document.body.style.overflow` is restored. Clearing `localStorage` for this origin resets the app.
- API errors: verify TMDb/OMDb keys and network access from the server.

## Contributing
- Follow existing component patterns and Tailwind conventions
- Keep components small and accessible, avoid committing secrets
- Use the Express proxy; do not call external APIs directly from the client
