# onlyseries.towatch — Documentation

This document describes the app’s architecture, key features, data model, and recent UX changes.

## Overview
A client-first React app to search, bookmark, group (franchise), and track movies/TV shows. Data is stored in localStorage with import/export to JSON. A small Express proxy serves TMDB/OMDb requests in development/production builds.

## Key Features
- Bookmarks: Add movies/TV via TMDB search; deduped; persisted locally
- Manual franchises: Select movies and assign a franchise name; franchises render as a single card
- Unified franchise toggle: Toggling watched on a franchise updates all contained movies immediately (card overlay and franchise dialog)
- Pagination: 36 cards/page with input and Previous/Next controls at top and bottom
- Sorting: A→Z, Z→A, Time added (First→Last / Last→First); applies to franchises and individual items
- Watch filter: All / Will Watch / Watched
- Catalog search (top): Suggestions appear only while typing (min 2 chars); fuzzy ranking with selection boosts; tab filter (All/TV/Movies); “Show more” beyond 10; offline-aware; hides already-added items
- In‑library search (pagination bar): Collapsible search icon expands to a live-search bar; results dropdown appears under input and respects current watch filter; grid does not collapse
- Series matrix: Stable grid with horizontal scroll for episodes and vertical scroll for seasons; scrollbars appear only when overflow
- Detail dialogs: Compact, no-scroll movie dialogs on mobile/desktop with title, year, type, IMDb rating, toggle, runtime, delete, and poster. Franchise naming dialog is larger with a filter field and a 5–6 column chip grid; chips show names only with truncation “.....” and are toggleable.
- Top actions: On mobile, top-right icons stay on a single line
- Import/Export: Download/Upload JSON reflects full state (franchise, watchStatus, addedAt, etc.)

## Architecture
- Client: React 18 + Vite + Tailwind; small GSAP entrance animations; lucide-react icons; Radix-based UI primitives (dropdown, toast, tooltip)
- Server: Express proxy for TMDB and OMDb
- Styling: Tailwind utility classes with custom theme in client/global.css and tailwind.config.js

## Data Model (localStorage)
Key: onlyseries-bookmarks
Each item contains:
- id: number (TMDB id)
- type: "movie" | "tv"
- title: string
- year: string | number
- poster: string (TMDB image URL)
- imdbRating: string (e.g., "7.9" or "N/A")
- runtime?: number (minutes, movies)
- seasons?: number (tv)
- episodes?: number (tv)
- watchStatus: "watched" | "unwatched"
- franchise?: string (manual grouping label)
- addedAt: number (ms timestamp; backfilled when missing)

Exported JSON mirrors the above. Import preserves franchise/watchStatus and backfills addedAt when missing.

## Files and Responsibilities
- client/pages/Index.jsx
  - Loads/saves bookmarks; migration/backfill for addedAt
  - UI controls (filter, sort, share, import/export)
  - Franchise selection workflow and naming dialog
  - Renders SearchBar, Timer, BookmarksGrid, DialogBox, OfflineBanner, ScrollToTop
- client/components/SearchBar.jsx
  - Debounced catalog search; suggestions only while typing; fuzzy/boosted ranking; tab filter and “Show more”; hides already-bookmarked items
- client/components/BookmarksGrid.jsx
  - Cards (franchises + individual items), pagination controls at top/bottom
  - Hover actions (toggle watched, remove)
  - Collapsible in‑library search icon with live dropdown results (respects watch filter)
- client/components/DialogBox.jsx
  - Compact movie dialog (mobile/desktop) with required fields and no scrolling
  - Franchise naming dialog improved: larger, filterable list with 5–6 column chips; names truncated with “.....”; chip click toggles select/unselect; franchise toggle still applies to all movies in franchise
- client/components/EpisodeRatingGrid.jsx
  - Series matrix with stable layout; shows scrollbars only when seasons/episodes overflow
- client/hooks/use-mobile.jsx
  - Mobile detection via matchMedia
- client/hooks/use-offline.js
  - Online/offline state
- client/lib/api.js
  - Calls Express proxy for TMDB/OMDb
- server/index.js and server/routes/tmdb-proxy.js
  - Express server and proxy endpoints

## UX Details and Behaviors
- Mobile top icons: Fixed bar; icons stay on a single line
- In‑library search (pagination bar)
  - Default: search icon only
  - Click icon: expands to input and auto-focuses; typing shows up to 20 results in dropdown
  - Results dropdown: Does not affect main grid; respects watch filter; click to open the item/franchise dialog
  - Click icon again (or Esc): collapses input
- Franchise toggle
  - Franchise card overlay and franchise dialog display a single toggle
  - State reflects if all movies are watched; toggling sets/clears watched on all contained movies instantly
- Series matrix
  - Horizontal scroll for episodes, vertical scroll for seasons; scrollbars appear only on overflow and layout remains stable
- Detail dialogs (movies)
  - Show title, year, type, IMDb rating, watch toggle, runtime, delete, and poster; compact layout avoids scrolling

## Sorting and Pagination
- Sorting merges franchise cards and individual items with unified rules
- Pagination uses PAGE_SIZE = 36
- Page input supports direct navigation (clamped to [1..totalPages])

## Environment
- Server requires OMDb/TMDB keys (see README’s Environment Variables section)
- No secrets are committed; set via environment when deploying

## Development Scripts (npm)
- npm run dev — Vite dev server (with Express middleware)
- npm run build — Build client and server bundles
- npm start — Run built server

## Recent Changes (Highlights)
- Top actions: single-line mobile fix
- Unified franchise toggle across card overlay and dialog
- Stable series matrix with controlled scrollbars
- Compact, no-scroll movie dialogs for mobile and desktop
- In‑library search: collapsible icon, live results dropdown; grid unaffected
- Time sort stability via addedAt backfill
- Unique franchise card keys to prevent collisions
- Improved search state to avoid flicker/stale results

## Extending the App
- New fields: Add where bookmarks are created (Index.jsx onAddBookmark) and they’ll be included in export/import automatically
- New sort/filter: Extend BookmarksGrid sorting and Index.jsx controls
- New APIs: Add Express routes and client/lib/api.js helpers
