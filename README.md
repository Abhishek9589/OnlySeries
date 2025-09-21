🎬 onlyseries.towatch — Track & bookmark movies & TV

![build](https://img.shields.io/badge/build-passing-brightgreen)
![license](https://img.shields.io/badge/license-MIT-blue)
![stars](https://img.shields.io/badge/stars-—-lightgrey)
![forks](https://img.shields.io/badge/forks-—-lightgrey)

---

## Description

onlyseries.towatch is a lightweight, privacy-first web app for discovering, bookmarking, and tracking movies and TV shows. It uses TMDb for search and metadata and OMDb to verify IMDb ratings. Everything you save stays in your browser (localStorage) — no account required.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Installation](#installation--setup)
- [Usage](#usage)
- [Configuration / Environment Variables](#configuration--environment-variables)
- [Screenshots / Demo](#screenshots--demo)
- [Contributing](#contributing)
- [License](#license)
- [Acknowledgements](#acknowledgements)
- [Footer](#footer)

## Features

- 🔎 Fast search for movies and TV shows (TMDb)
- ⭐ Bookmark and organize your library locally
- 📊 Verify IMDb ratings via OMDb (server-side proxy)
- ⏱ Estimate watch time and track progress
- ⬇️ Import / export your library as JSON
- ⚙️ Works offline with localStorage / IndexedDB fallback

## Tech Stack

- Frontend: React 18 + Vite
- Styling: Tailwind CSS
- UI primitives: Radix UI
- Server: Express.js (proxy) with serverless wrappers for Vercel
- HTTP: Axios
- Build: Vite (client) + Vite server build for Node

## Installation / Setup

Clone the repository and install dependencies:

```bash
git clone <YOUR_REPO_URL>
cd <YOUR_REPO_DIR>
npm install
```

Run the development server:

```bash
npm run dev
# open the URL printed by Vite (usually http://localhost:5173)
```

Build for production:

```bash
npm run build
# to run the server build locally
npm start
```

## Usage

- Use the search box on the homepage to find movies or TV shows.
- Bookmark items to add them to your local library (stored in localStorage under `onlyseries-bookmarks`).
- Click an item to view details (episodes, seasons, runtime) and IMDb rating (proxied via OMDb).

Example API calls (server proxy):

```bash
# Search movies
GET /api/search/movies?query=house&page=1

# Search TV
GET /api/search/tv?query=friends&page=1

# Get TV details (minimal mode for lightweight payload)
GET /api/tv/:id?minimal=true

# Get IMDb rating
GET /api/imdb-rating?title=House%20MD&year=2004
```

## Configuration / Environment Variables

Create a `.env` file in the project root (do not commit it) and add the following values:

```env
# Required
TMDB_API_KEY=your_tmdb_api_key

# One or more OMDb API keys (used for IMDb rating verification)
OMDB_API_KEY_1=your_omdb_key_1
OMDB_API_KEY_2=your_omdb_key_2
OMDB_API_KEY_3=your_omdb_key_3
OMDB_API_KEY_4=your_omdb_key_4
OMDB_API_KEY_5=your_omdb_key_5
```

Notes:
- TMDb API key must remain server-side (do not embed it into the client bundle).
- The server rotates through OMDb keys when keys are rate-limited or exhausted.

## Deployment (Vercel)

Recommended approach to deploy the whole repo on Vercel:

- Build Command: `npm run build`
- Output Directory: `dist/spa`
- Install Command: `npm install`
- Add the environment variables in Project Settings (TMDB_API_KEY, OMDB_API_KEY_1..OMDB_API_KEY_5)

This repository includes `api/*` serverless wrappers and a `vercel.json` to expose the same proxy endpoints as serverless functions. If you need persistent or long-running server behavior (heavy TV-season enrichment), consider hosting the Express server externally and point the client to that URL.

## Screenshots / Demo

![screenshot-1](./public/screenshot-1.png)

*Replace the above image with real screenshots or GIFs showing the search and bookmark flow.*

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Make your changes and commit: `git commit -m "feat: add ..."`
4. Push to your fork: `git push origin feat/your-feature`
5. Open a Pull Request describing your change

Please keep secrets out of commits and follow existing code and styling patterns (Tailwind + small focused components).

## License

This project is licensed under the MIT License — see the [LICENSE](./LICENSE) file for details.

## Acknowledgements / Credits

- TMDb (The Movie Database) — search & metadata API
- OMDb — IMDb ratings
- Radix UI, Tailwind CSS, Vite, React

## Footer

> Made with ❤️ by Abhishek

