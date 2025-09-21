# 📂 Project Documentation

This file is a developer reference that explains the folder layout, purpose of each file, and where to look when making changes. Use this as the single‑place guide for understanding the repository structure, runtime shapes, and operational notes.

---

## 📁 Repository tree (high-level)

```text
.
├── api/                      # Vercel serverless wrappers (optional)
├── client/                   # Frontend app (React + Vite)
│   ├── components/           # Reusable UI components (SearchBar, BookmarksGrid, UI primitives)
│   │   └── ui/               # Small UI wrappers (button, tooltip, toaster...)
│   ├── hooks/                # Custom React hooks (use-mobile, use-offline)
│   ├── lib/                  # Client helpers (api.js, persist.js, utils.js)
│   ├── pages/                # Page components (Index.jsx)
│   ├── App.jsx               # App root
│   └── global.css            # Tailwind + global styles
├── public/                   # Static assets (images, icons)
├── server/                   # Server code and route logic
│   ├── routes/               # Core proxy logic (tmdb-proxy.js)
│   ├── index.js              # Express server factory (createServer)
│   └── node-build.js         # Build helper for server packaging
├── dist/                     # Build output (generated)
├── package.json
├── vercel.json               # Vercel build & routing config
├── vite.config.js
├── vite.config.server.js
├── tailwind.config.js
├── postcss.config.js
├── README.md
└── docs.md
```

> Note: `api/` contains serverless wrappers created to deploy the proxy on Vercel; the original Express server lives under `server/`.

---

## 📄 File & Folder explanations

### client/
- 📄 client/pages/Index.jsx
  - The main page (hero, top control bar with Filter/Sort/More, and SearchBar). Data-loc hints: client/pages/Index.jsx:539:5 → ~667:17 for the hero and controls.
- 📄 client/components/SearchBar.jsx
  - Search input UI and logic; placeholder: "Search for a movie or series...". Data-loc hints: client/components/SearchBar.jsx:459:5 → 462:9.
- 📄 client/components/
  - Reusable components: BookmarksGrid.jsx, FallbackImage.jsx, DialogBox.jsx, ConfirmDialog.jsx, Toast/Toaster implementations and small UI primitives in `ui/`.
- 📄 client/lib/api.js
  - Client-side network helpers that call server endpoints under `/api/*` and normalize responses.
- 📄 client/lib/persist.js
  - Local persistence utilities (reads/writes `onlyseries-bookmarks`, UI state keys, caching logic).
- 📄 client/hooks/
  - Hooks like `use-mobile.jsx` and `use-offline.js` for device detection and offline handling.

### server/
- 📄 server/index.js
  - Exports `createServer()` which sets up an Express app and registers the API routes. Used for local dev (node server) or external hosting.
- 📄 server/routes/tmdb-proxy.js
  - Core proxy logic for TMDb and OMDb requests. Exports functions used by Express and the Vercel `api/*` wrappers:
    - searchMovies, searchTV, getMovieDetails, getTVDetails, getTVSeason, getIMDbRating, trendingMovies, trendingTV
  - Implements TMDb key usage, OMDb key rotation, and enrichment logic (season fetches, episode counts).
- 📄 server/node-build.js
  - Helper used in the server build pipeline to package server code for production.

### api/ (serverless wrappers)
- Each file adapts Vercel's handler signature to call the functions exported from `server/routes/tmdb-proxy.js`.
- Example files: `api/search/movies.js`, `api/tv/[id].js`, `api/imdb-rating.js`, etc.
- These wrappers allow deploying the same proxy behavior as serverless functions on Vercel.

### Config & build files
- 📄 package.json — project scripts and dependencies. Key scripts:
  - `npm run dev` → vite dev server
  - `npm run build` → builds client + server
  - `npm start` → runs `dist/server/node-build.mjs`
- 📄 vercel.json — Vercel configuration that declares static build for `dist/spa` and node serverless builds for `api/**/*.js`.
- 📄 vite.config.js, vite.config.server.js — Vite client and server build configs.
- 📄 tailwind.config.js, postcss.config.js — styling toolchain configuration.
- 📄 .env (not committed) — runtime secrets for TMDb and OMDb keys.

---

## ⚙️ Detailed role of key files

### server/routes/tmdb-proxy.js
- Acts as the authoritative server-side access layer to third‑party APIs.
- Responsibilities:
  - Keep TMDb API key server-side and issue TMDb requests via `tmdbGet()`.
  - Rotate OMDb API keys (OMDB_API_KEY_1..OMDB_API_KEY_5) when keys fail or are rate-limited.
  - Provide normalized JSON shapes to the client and perform enrichment (e.g., compute episode totals by fetching seasons).
- Important consideration: `getTVDetails` can perform multiple per-season requests; use `?minimal=true` to return a lightweight payload.

### client/lib/api.js
- Central place for REST calls to `/api/*`.
- Normalizes TMDb results into a consistent client shape, dedupes results from movies/tv endpoints, and caches results per query.

### client/components/SearchBar.jsx
- Debounces user input, performs parallel searches against `/api/search/movies` and `/api/search/tv`, merges and ranks results, and flags previously bookmarked items (localStorage) as "Added".
- UI important bits are located near the data-loc markers referenced above for traceability.

### vercel.json
- Declares static build of the client (`dist/spa`) and node serverless handlers for the `api/` folder so the project can be hosted fully on Vercel.

---

## 🔧 Configuration files explained

- .env (development only) — contains secrets. Example keys required at runtime:
  - TMDB_API_KEY — TMDb server key (keep secret)
  - OMDB_API_KEY_1..OMDB_API_KEY_5 — OMDb keys for IMDb ratings
- package.json — contains scripts and dependency versions
- vercel.json — routes and build configuration for Vercel
- tailwind.config.js & postcss.config.js — Tailwind setup and PostCSS plugins
- vite.config.js / vite.config.server.js — Vite build configs for client and server bundles

---

## 🧭 How to navigate the codebase (common tasks)

- Modify UI
  - Look in `client/components/` and `client/pages/Index.jsx` for page-level layout and the hero/search placement.
  - UI primitives live in `client/components/ui/` — reuse them for consistent look & accessibility.

- Add a new API route
  - Option A (Express server): add a function in `server/routes/tmdb-proxy.js` and register it in `server/index.js`.
  - Option B (Vercel serverless): add a wrapper in `api/` that calls a function exported from `server/routes/tmdb-proxy.js`, or implement lightweight handler directly in `api/`.

- Update server-side logic or add caching
  - Edit `server/routes/tmdb-proxy.js`. For caching, consider adding an in-process LRU cache or integrating a managed cache (Redis, Upstash) and persist frequently requested results like TV details and imdbRating.

- Change configuration
  - Edit `vite.config*.js` for build changes, `tailwind.config.js` for style tokens, and `vercel.json` to adjust deployment behavior.

---

## 🚀 Deployment notes

- Full Vercel deployment is supported: client served from `dist/spa` and API endpoints exposed via the `api/` serverless wrappers. Ensure environment variables are added in Vercel Project Settings before deployment.
- Watch out for serverless time limits on heavy endpoints (e.g., TV season enrichment). Use `?minimal=true`, server-side caching, or host the Express server externally for long-running operations.

---

## 🛠 Troubleshooting quick tips

- Search shows no results: verify `TMDB_API_KEY` is set and the deployed environment has network access to `api.themoviedb.org`.
- IMDb ratings missing: confirm OMDb keys exist and are not rate-limited. Consider server-side caching for imdbRating lookups.
- To reset local dev state: clear localStorage keys `onlyseries-bookmarks`, `onlyseries-ui-v1`, `searchCacheV2` and delete IndexedDB `onlyseries-db` if present.

---

## ✅ Next steps / recommended improvements

- Add server-side caching for `getTVDetails` and `getIMDbRating` to reduce external calls and avoid serverless timeouts.
- Add integration tests for critical API wrappers (tmdb-proxy) and end-to-end tests for search flow.
- Document individual components with small JSDoc or MD snippets near components for faster onboarding.

---

If you want, I can now:
- Expand this docs.md with inline code snippets for the key functions (tmdb-proxy, client/lib/api.js), or
- Implement a small in-memory cache for `getTVDetails` and `getIMDbRating` and wire it into the server code.

Tell me which next step you prefer and I will proceed.
