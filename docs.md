# onlyseries.towatch – Developer Guide

This document explains the architecture, data model, key flows, and operational guidance for the project.

## Architecture overview
- Client: React 18 app built with Vite and Tailwind. Components live under `client/components`, page shells under `client/pages`.
- Server: Express app that exposes a small set of endpoints and proxies TMDb/OMDb with API‑key rotation and basic error handling.
- Data: the user’s library and preferences are stored in `localStorage`; no external database is required.

## Core flows
### 1) Search
- The client calls `/api/search/movies` and `/api/search/tv`.
- Results are combined, deduped, ranked by fuzzy similarity and rating, and cached in `localStorage` with a TTL to keep the UI responsive.

### 2) Bookmarking
- Adding a result creates a bookmark object `{ id, type, title, year, poster, imdbRating, runtime/episodes, watchStatus, franchise?, addedAt }`.
- Objects are appended to `onlyseries-bookmarks`. `addedAt` stabilizes time‑based sorting.

### 3) Enrichment
- Movies: `/api/movie/:id` supplies runtime and `external_ids.imdb_id`. The app requests `/api/imdb-rating` to verify the IMDb score. If OMDb does not respond, TMDb’s vote average is used.
- Series: `/api/tv/:id` supplies seasons, episodes, runtimes, genres, and external IDs. Average runtime and total runtime are computed from the data returned.

### 4) Franchises
- A franchise is a free‑text string stored on movie bookmarks. Grouping creates a derived “franchise card” in the grid. Average franchise rating is computed from member items.

### 5) Episode ratings matrix
- `EpisodeRatingGrid` fetches per‑season data via `/api/tv/:id/season/:season` in small batches and renders a responsive grid with sticky headers.

## Client structure
- `client/pages/Index.jsx` – application shell and state: loading/saving bookmarks, filters, dialogs, import/export, and passing handlers to children
- `client/components/SearchBar.jsx` – debounced search, ranking, bulk add
- `client/components/BookmarksGrid.jsx` – main grid, pagination, in‑library search, franchise cards
- `client/components/DialogBox.jsx` – details dialog for items and franchise view
- `client/components/EpisodeRatingGrid.jsx` – episode heatmap with accessibility and responsiveness
- `client/lib/api.js` – axios wrappers for server endpoints, caching, and fallbacks

## Server
- `server/index.js` wires routes from `server/routes/tmdb-proxy.js`
- TMDb and OMDb keys rotate automatically when rate‑limited or rejected
- Endpoints: `/api/search/movies`, `/api/search/tv`, `/api/movie/:id`, `/api/tv/:id`, `/api/tv/:id/season/:season`, `/api/imdb-rating`, `/api/trending/*`

## Data model
- `onlyseries-bookmarks` – array of bookmark objects
- `onlyseries-ui-v1` – filters, sort, and selection UI state
- Search caches – short‑lived local caches for faster UX

## Styling & accessibility
- Tailwind utility classes with CSS variables in `client/global.css`
- Focus states and keyboard semantics on actionable elements
- Dialogs lock body scroll while open; overlay click closes the dialog; internal content scrolls inside a max‑height container

## Build and run
```bash
npm install
npm run dev        # local development
npm run build
npm start          # run built server + serve client
```

## Configuration
Set environment variables for the server process:
- `TMDB_API_KEY` (or `TMDB_API_KEY_1`, `TMDB_API_KEY_2`, ...)
- `OMDB_API_KEY_1..5`

## Error handling
- Client detects offline mode and degrades gracefully
- Server rotates API keys on 401/403/429 and surfaces stable JSON errors
- IMDb verification returns `"N/A"` when all OMDb keys are exhausted

## Import/Export
- Export: downloads a JSON file of the entire `onlyseries-bookmarks` array
- Import: replaces the current list, preserving or backfilling `addedAt`

## Performance notes
- Search results are cached (per query) to reduce network traffic
- Enrichment runs with small concurrency limits to avoid API bursts
- Images use TMDb CDN `w500` sizes for a balance of quality and speed

## Troubleshooting
- Blank screen or “stuck” overlay: reload the page. Ensure dialogs unmount correctly and that `document.body.style.overflow` is restored when closing any modal.
- Missing ratings: verify OMDb keys; the system falls back to TMDb vote average.
- API errors: confirm server env vars and outbound network access.

## Contribution guidelines
- Follow existing component patterns and naming
- Keep logic deterministic and side‑effect free where possible
- Do not commit secrets; consume all third‑party APIs through the server proxy
