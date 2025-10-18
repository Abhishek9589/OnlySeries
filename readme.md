# 🏷️ Project Title

- onlyseries.towatch
- Track, Bookmark & Watch Smarter

---

## 🧩 Description

A modern watchlist app to search, bookmark, and organize movies and TV series. It helps you plan what to watch, track progress, and estimate total watch time. Built with a fast React + Vite frontend and an Express API proxy to TMDb/OMDb for reliable metadata.

---

## 🚀 Features

- 🔎 Powerful global search (movies + TV)
- 🎬 One‑click bookmarking (movie/series)
- 🗂️ Franchise grouping for movies
- 🕒 Smart total watch‑time calculator
- 🔁 Import/Export bookmarks as JSON
- ✅ Watched / Will‑Watch toggles
- 📶 Offline awareness (gentle banner)
- 🧭 Pagination and local list filtering
- 🖼️ Robust poster fallback handling

---

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Radix UI (Dropdowns), Framer Motion, Lucide Icons
- **Backend**: Express, Axios, dotenv
- **Database/Storage**: LocalStorage + IndexedDB (client‑side persistence)
- **APIs**: TMDb (search/details), OMDb (IMDb ratings)
- **Hosting**: Fly.io / Netlify / Vercel (any Node‑capable host)

---

## 📂 Folder Structure

```bash
.
├── client/
│   ├── App.jsx
│   ├── index.html
│   ├── global.css
│   ├── components/
│   │   ├── ui/
│   │   │   ├── dropdown-menu.jsx
│   │   │   ├── sonner.jsx
│   │   │   └── toaster.jsx
│   │   ├── BookmarksGrid.jsx
│   │   ├── ConfirmDialog.jsx
│   │   ├── DialogBox.jsx
│   │   ├── FallbackImage.jsx
│   │   ├── OfflineBanner.jsx
│   │   ├── ScrollToTop.jsx
│   │   ├── SearchBar.jsx
│   │   └── Timer.jsx
│   ├── hooks/
│   │   ├── use-mobile.jsx
│   │   └── use-offline.js
│   ├── lib/
│   │   ├── api.js
│   │   ├── persist.js
│   │   └── utils.js
│   └── pages/
│       └── Index.jsx
├── server/
│   ├── index.js
│   ├── node-build.js
│   └── routes/
│       └── tmdb-proxy.js
├── package.json
├── tailwind.config.js
├── vite.config.js
└── vite.config.server.js
```

---

## ⚙️ Installation & Setup

> Prerequisites: Node.js ≥ 18, npm ≥ 9

### 🧪 Local Development (monorepo)

```bash
# 1) Clone the repository
git clone https://github.com/Abhishek9589/OnlySeriesTest.git
cd OnlySeriesTest

# 2) Install dependencies
npm install

# 3) Create .env with your API keys (see Environment Variables section)
#    Example: TMDB_API_KEY=xxxx

# 4) Start dev server (Vite + Express middleware)
npm run dev
# Frontend + API → http://localhost:8080
```

### 📦 Production Build & Run

```bash
# Build SPA and server bundle
npm run build

# Start production server
npm start
# Frontend + API served from dist/ on process.env.PORT (default 3000)
```

---

## 🌐 Deployment

- Frontend (Vercel): https://onlyseriestest.vercel.app
- Backend (Render): https://onlyseriestest.onrender.com

Both services are live and connected via environment variables in the root .env file. No extra configuration is required after deployment.

.env (root)

```dotenv
# Frontend (.env)
VITE_BACKEND_URL=https://onlyseriestest.onrender.com

# Backend (.env)
FRONTEND_URL=https://onlyseriestest.vercel.app
```

Notes:
- Frontend uses VITE_BACKEND_URL to call the backend at build/runtime.
- Backend uses FRONTEND_URL to restrict CORS to the deployed frontend only.

---

## 📘 API Endpoints

| Endpoint               | Method | Description                                  |
|------------------------|--------|----------------------------------------------|
| `/health`              | GET    | Health check (server status)                 |
| `/api/ping`            | GET    | Simple connectivity test                     |
| `/api/search/movies`   | GET    | Search movies on TMDb (query, page)          |
| `/api/search/tv`       | GET    | Search TV series on TMDb (query, page)       |
| `/api/movie/:id`       | GET    | TMDb movie details (with external_ids)       |
| `/api/tv/:id`          | GET    | TMDb TV details (with external_ids)          |
| `/api/imdb-rating`     | GET    | OMDb proxy to fetch IMDb rating               |

---

## 🧾 Environment Variables

```dotenv
# Required – TMDb API key (proxy uses it server-side)
TMDB_API_KEY=

# Optional – multiple OMDb keys supported (rotate to avoid limits)
OMDB_API_KEY_1=
OMDB_API_KEY_2=
OMDB_API_KEY_3=
OMDB_API_KEY_4=
OMDB_API_KEY_5=

# Optional – server config
PORT=3000
PING_MESSAGE=ping
```

---

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Commit changes: `git commit -m "feat: add your feature"`
4. Push branch: `git push origin feat/your-feature`
5. Open a Pull Request targeting `main` (include context and screenshots if relevant)

---

## 📜 License

MIT

---

## 💬 Contact / Credits

- Developer: Abhishek Kushwaha
- Portfolio: https://portfolio-4knb.vercel.app/
- Email: abhihekkushwaha9589@gmail.com
- GitHub: https://github.com/abhishek9589
- LinkedIn: https://www.linkedin.com/in/abhishekkushwaha9589/
