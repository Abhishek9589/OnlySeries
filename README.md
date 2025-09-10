# onlyseries.towatch

A fast, client-first web app to search, bookmark, group, and track movies & TV shows. Data is stored locally (localStorage) with import/export to JSON. The app provides a compact UX for mobile and richer tools on larger screens: franchise grouping, series episode matrices, a watch-time timer, and intelligent search behavior.

## High-level summary of recent updates
- Franchise dialog redesigned into a search-only modal: a single search input that behaves like the main catalog search (suggestions appear only after typing 2+ chars). Typing shows matching franchise names; selecting one applies it to the selected movies. An "Add "X"" button appears when the user types 2+ characters to create & apply a new franchise immediately.
- UI actions adjusted: removed the standalone Share icon from the top action row (Share remains in the three-dot menu). Upload action in three-dot menu no longer shows an upload icon (keeps text). The 3-dots menu option previously labeled "Reset app and clear bookmarks" is now renamed to "Reset All".
- Timer improvements: Timer now recalculates dynamically based on both watch filters (all/watched/unwatched) and the type filter (movies/series/all), ensuring accurate aggregated watch-time and counts.
- Dialog behavior & body scroll lock: When any modal or dialog is open, the main page body scrolling is locked so only the modal/dialog scroll bar is usable. Dialog containers were made scrollable with max-height constraints so content won't be clipped on small viewports.
- Franchise and item dialogs: Franchise card view and movie/series dialogs have been adjusted to avoid clipping and to present metadata responsively on small screens. The franchise/dialog header metadata uses responsive sizing and horizontal overflow handling.
- In-library search visibility: The in-library search control (near pagination) now appears on tablet (md) and larger screens for easier use on tablets without changing behavior on phones. The pagination/search layout was updated so the pagination controls remain on one line across sizes.
- Series matrix (EpisodeRatingGrid) responsive enhancements:
  - Cells (episode blocks) are responsive to viewport width (smaller on phones, larger on desktop).
  - Text inside cells scales with the cell size and uses ellipsis/overflow rules to avoid overlap.
  - Sticky headers: the left season column and top episode row are sticky and use a consistent frosted-glass (backdrop blur) header style for readability during scroll. The top-left corner cell is also sticky and shares the same frosted effect.
- UX polish: truncated chips, focus rings, accessible controls, consistent z-indexing, and smoother animations with GSAP.

## Features (overview)
- Add bookmarks from TMDB search (movies & TV). Deduped and persisted to localStorage (key: onlyseries-bookmarks).
- Manual franchise/grouping: select multiple movies and group them under a named franchise (create or reuse existing names from the search-only franchise dialog).
- Pagination with jump-to-page input and Prev/Next controls; controls appear above & below the grid. Pagination layout adjusted to avoid wrapping on smaller widths.
- Powerful search UX:
  - Catalog search (top): Debounced, fuzzy-matched suggestions shown only while typing (min 2 chars), tabbed by All/TV/Movies, and includes a "Show more" mechanism.
  - In-library search (pagination bar): compact icon expands to a wider input (md+ visible) with live dropdown results that respect the current watch filter; grid layout remains stable.
- Watch status toggles (Watched / Will Watch) with bulk-toggling for franchises.
- Watch-time Timer: Computes aggregated minutes for displayed items and formats into Yr:Day:Hr:Min with counts for movies and series.
- Import/Export JSON: Preserve franchise and watchStatus; addedAt is backfilled when missing for sort stability.
- Series episode matrix: stable x/y grid with sticky headers and responsive cells; scrollbars appear only when content overflows.

## Quick Start
1. npm install
2. npm run dev — Vite dev server (default http://localhost:8080) with Express API mounted as middleware
3. npm run build && npm start — Build client + server and run the production bundle

## Scripts
- dev: vite
- build: vite build (client) + vite build --config vite.config.server.js (server)
- start: node dist/server/node-build.mjs
- test: vitest --run
- format.fix: prettier --write .

## Server API Endpoints (proxy)
- GET /health
- GET /api/ping
- GET /api/search/movies
- GET /api/search/tv
- GET /api/movie/:id
- GET /api/tv/:id
- GET /api/tv/:id/season/:season
- GET /api/imdb-rating?title=...&year=...
- GET /api/trending/movies
- GET /api/trending/tv

## Environment Variables (server)
- TMDB_API_KEY=your_tmdb_key
- OMDB_API_KEYS=key1,key2,key3 (comma-separated; automatic failover)

## Data model (localStorage key: onlyseries-bookmarks)
Each bookmark object includes: id, type (movie|tv), title, year, poster, imdbRating, runtime (movie) / seasons & episodes (tv), watchStatus (watched|unwatched), franchise (optional), addedAt (ms timestamp).

## Notable Implementation Details & Conventions
- addedAt is used to stabilize time-based sorting and is backfilled on import when missing.
- Franchise grouping sets the franchise name string on the selected movie items; franchise cards are computed views derived from grouped items.
- UI primitives follow Tailwind + Radix patterns. Styling variables are defined in client/global.css and referenced by tailwind.config.js.

## Recent changelog (detailed)
- Reworked franchise naming dialog into a search-first modal (type 2+ chars to see suggestions; Add button appears only after 2+ chars).
- Removed standalone Share top button; Share remains available in the three-dots menu.
- Removed the upload icon glyph from the Upload menu item and simplified label.
- Renamed 3-dots reset option to "Reset All".
- Timer now reacts to both watch filter and type filter (movies/series) and updates automatically.
- Fixed duplicate React imports and general syntax issues.
- Locked body scrolling when any modal/dialog is open; dialog containers scroll internally (max-height + overflow-y).
- In-library search control now visible on md+ (tablet and above) and remains hidden on smaller phones.
- Pagination layout changed from grid to a flex row with a flexible center section so controls stay on one line across sizes.
- EpisodeRatingGrid: responsive cell sizes, responsive font sizes, sticky frosted headers (same blur and alpha), improved cell overflow rules to avoid overlapping text.

---

If you want, I can also add a short changelog section per feature or produce a lightweight "How to use the new franchise dialog" quick-guide.
