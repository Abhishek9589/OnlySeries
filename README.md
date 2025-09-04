# onlyseries.towatch

A fast, client-first web app to search, bookmark, group, and track movies/TV shows. Includes manual franchise grouping, pagination with jump-to-page, rich search with expandable suggestions (shown only while typing), watch-status filtering, sorting, a watch-time timer, and JSON import/export.

## Features
- Bookmarks: Add movies/TV from TMDB search; deduped; persisted to localStorage
- Manual franchises: Multi-select movies, name/create or add to existing franchise; grouped cards with hover actions; unified franchise toggle (card and dialog) updates all movies at once
- Pagination: 36 cards per page, page input, Previous/Next, controls shown above and below grid
- Sorting: A → Z, Z → A, Time added (First → Last / Last → First); applies to franchises and individual items
- Watch status: Toggle Watched / Will Watch; filter by all/watched/unwatched
- Search (catalog): Suggestions appear only while typing (min 2 chars), ranked with fuzzy matching and selection boosts; tab filter (All/TV/Movies) with “Show more” beyond 10; offline-aware UX; hides already-added items
- Search (in-library): Compact icon near pagination expands to a search bar; live dropdown results respect the current watch filter; grid remains unchanged
- Timer: Aggregated watch time (Year:Day:Hr:Min) with counts of movies and series
- Import/Export: Download current library to JSON (includes franchise, watchStatus, addedAt, etc). Upload restores these
- Responsive UI: Desktop, tablet, mobile; top actions keep a single row on mobile; compact no-scroll detail dialogs for movie on mobile/desktop; sticky scroll-to-top button
- Series matrix: Stable grid with x-axis scroll for episodes and y-axis scroll for seasons; scrollbars appear only when overflow

## Tech Stack
- React 18 + Vite (dev/build)
- Tailwind CSS + Radix primitives + lucide-react icons
- Express API (server) with TMDB + OMDb proxy and key rotation
- GSAP for small entrance animations

## Usage
- Add items: Use the main search at the top to add movies/series. Click a suggestion to add.
- In-library search: On the pagination bar, click the search icon to expand a compact search. Typing shows live results below the input without changing the grid; results respect the current All/Watched/Will Watch filter. Click again (or Esc) to collapse.
- Franchise toggle: On a franchise card (hover) and in the franchise dialog, the watch toggle applies to all movies in that franchise at once and updates immediately.
- Detail dialogs: Movie dialogs are compact and avoid scrolling on mobile/desktop while still showing title, year, type, IMDb rating, toggle, runtime, delete, and poster.
- Series matrix: Scroll horizontally to see more episodes and vertically to see more seasons; scrollbars appear only when there’s overflow.
- Top actions: On mobile, top-right actions/icons stay on a single row.

## Scripts
- dev: vite (client dev server)
- build: vite build (client) + vite build --config vite.config.server.js (server)
- start: node dist/server/node-build.mjs (serve built app + API)
- test: vitest --run

Use npm:
- npm install
- npm run dev (client dev)
- npm run build && npm start (full production build + server)

## Environment Variables (server)
Create a .env (not committed) for server builds:
- TMDB_API_KEY=your_tmdb_key
- OMDB_API_KEYS=key1,key2,key3  (comma-separated; automatic failover)

## Data Model (localStorage)
Key: onlyseries-bookmarks
Each item:
- id: number (TMDB id)
- type: "movie" | "tv"
- title, year, poster
- imdbRating: string (e.g. "7.9" or "N/A")
- runtime (movies), seasons/episodes (tv)
- watchStatus: "watched" | "unwatched"
- franchise: string | undefined (manual grouping label)
- addedAt: number (ms timestamp used for sorting)

Exported JSON from Download Bookmarks contains the current state as above. Import preserves franchise and watchStatus; addedAt is backfilled if missing.

---

# Project Documentation (file-by-file)

This section walks through the codebase so a newcomer can understand what each file does and how pieces fit together.

## Root
- package.json: Project metadata and scripts. Notable scripts: dev (client dev with Vite), build (client+server), start (runs built server). Dependencies include React, Tailwind, Express, dotenv, GSAP, Radix, lucide-react.
- vite.config.js: Vite config for the client build/dev server.
- vite.config.server.js: Vite config for bundling the Express server (SSR/API bundle in dist/server/).
- tailwind.config.js: Tailwind theme and content scanning (client/**/*.{js,jsx}); custom colors, animations, and CSS variables.
- postcss.config.js: Tailwind + autoprefixer config for CSS processing.
- index.html: Vite entry HTML mounting the React app.
- components.json: Radix UI/shadcn component settings (used for consistent styles).

## server/
- index.js: Express app with CORS and JSON; mounts routes from routes/tmdb-proxy.js; exposes endpoints used by the client:
  - GET /api/imdb-rating?title=...&year=...
  - GET /api/tv/:id/season/:season
- routes/tmdb-proxy.js: Implements TMDB and OMDb proxy logic.
  - getTVSeason: Fetches TMDB season details by tv id and season number.
  - getIMDbRating: Queries OMDb with automatic key rotation and basic error handling; returns { imdbRating, imdbID }.
- node-build.js: Helper for node build output (entry used by start script after build).

## client/
### App & Pages
- App.jsx: Root React component composition (mount point for pages).
- pages/Index.jsx: Main page orchestrating the app. Responsibilities:
  - Loads/saves bookmarks to localStorage (key: onlyseries-bookmarks)
  - Migration helpers (e.g., backfill addedAt)
  - UI controls (filter, sort, import/export, share)
  - Franchise selection mode and naming dialog
  - Renders SearchBar, Timer, BookmarksGrid, DialogBox, OfflineBanner, ScrollToTop
- pages/NotFound.jsx: Fallback page for unknown routes.

### Components (client/components)
- SearchBar.jsx: Debounced TMDB search UI. Suggestions are shown only while typing (min 2 chars) with fuzzy matching, selection boosting, tab filter (All/TV/Movies), and “Show more”. Limits extra API calls (details/ratings for first ~7). Hides items already in bookmarks. Calls onAddBookmark on click.
- Timer.jsx: Aggregates total watch time over filtered bookmarks; displays as Yr:Day:Hr:Min plus counts for movies/series.
- BookmarksGrid.jsx: Displays cards (franchises + individual items), 36 per page with page input and prev/next on top and bottom. Supports selectionMode for grouping; hover actions include toggle watch status and remove.
- DialogBox.jsx: Details dialog for a selected item (and franchise aggregates if applicable). Franchise naming dialog improved: larger layout, filter field, 5–6 column chip grid, names-only chips with truncation “.....”, and toggleable selection.
- OfflineBanner.jsx: Warns when offline for search.
- FallbackImage.jsx: Robust image component with graceful fallback styling.
- StreamingPlatforms.jsx, EpisodeRatingGrid.jsx, SearchBar.jsx, etc.: Feature-specific UI.
- ScrollToTop.jsx: Sticky bottom-right button to smooth scroll to top when user has scrolled down.

#### UI primitives (client/components/ui)
- button.jsx, dropdown-menu.jsx, toast.jsx, toaster.jsx, tooltip.jsx, sonner.jsx: Small UI primitives/wrappers (Radix/shadcn patterns) used across the app.

### Hooks (client/hooks)
- use-offline.js: React hook that returns online/offline status (drives OfflineBanner and search behavior).
- use-mobile.jsx: Media-query helper for mobile detection.
- use-toast.js: Toast/sonner integration hook.

### lib (client/lib)
- api.js: Client-side API helpers that call the Express proxy endpoints (TMDB and OMDb).
- streaming.js: Helper utilities for streaming platform data (if present in your flows).
- utils.js: General-purpose utilities used across components.

### Styles
- global.css: Tailwind layers and CSS variables; applies dark theme and custom scrollbar; sets CSS variables used by tailwind.config.js.

## public/
- robots.txt: Basic robots directives.

## Data Flow Summary
1) User searches in SearchBar → TMDB results are fetched (movies + TV) → suggestions are built (first ~7 with details/IMDb rating) and shown only while typing. Offline state shows a friendly message.
2) Clicking a result calls onAddBookmark → Index.jsx adds a normalized item into localStorage with fields (type, id, title, poster, year, imdbRating, runtime/seasons/episodes, watchStatus, franchise?, addedAt).
3) Index.jsx renders BookmarksGrid with current filter/sort, selectionMode flags, and callbacks.
4) Grouping to franchise: enter selection mode → pick movies → "Group as Franchise" → choose existing or type a name in dialog → selected movies get franchise set to that name. Franchises display as single cards summarizing grouped items.
5) Export: Download Bookmarks creates a JSON file of exactly what’s in localStorage (including franchise, watchStatus, addedAt). Import: Restores that data (adds addedAt if missing).

## Conventions & Gotchas
- addedAt is a numeric timestamp used for time-based sorting; it’s applied on add/import if missing.
- imdbRating can be "N/A" if OMDb rate limits are hit; free key quotas reset daily (UTC).
- 36 items per page; input lets you jump to any page; prev/next are disabled at bounds.
- Sorting applies to both franchises (by name or min/max addedAt) and individuals; a unified sort merges them into a single list.
- CSS: Utility classes via Tailwind; custom theme variables in global.css.

## How to Extend
- Add new fields to bookmark items by updating where items are created (SearchBar → onAddBookmark in Index.jsx) and ensuring export/import reflect changes automatically via localStorage serialization.
- Add more sort options by extending BookmarksGrid’s sortType handling and the sort dropdown in Index.jsx.
- Add server endpoints in server/routes and expose them in server/index.js; call them via client/lib/api.js.

## Changelog
- Added: Suggestions shown only while typing with tab filters and “Show more”
- Added: Selection-based boosting and fuzzy ranking in catalog search
- Added: Larger franchise naming dialog with filter, 5–6 column chip grid, truncation “.....”, and toggleable chips
- Added: In-library search icon on pagination with live-search dropdown (respects filter)
- Fixed: Time-based sorting stability by backfilling missing addedAt
- Fixed: Franchise card keys uniqueness to avoid React key collisions
- Improved: Search state management to avoid flicker and stale results
