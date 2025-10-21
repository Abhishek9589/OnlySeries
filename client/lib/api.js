import axios from "axios";

// Enhanced error handling with offline detection
const handleApiError = (error, fallback = null) => {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    console.warn("API call failed - you're offline");
    return fallback;
  }

  if (error.response?.status >= 500) {
    console.warn("Server error - API temporarily unavailable");
  } else if (error.code === 'NETWORK_ERROR' || !error.response) {
    console.warn("Network error - check your connection");
  } else {
    console.warn("API error:", error.message);
  }

  return fallback;
};

// Use local API proxy endpoints instead of direct external API calls
export const getIMDbRating = async ({ title, year, imdbId } = {}) => {
  try {
    const response = await axios.get("/api/imdb-rating", {
      params: { title, year, imdbId },
      timeout: 10000, // 10 second timeout
    });
    return response.data.imdbRating || "N/A";
  } catch (error) {
    return handleApiError(error, "N/A");
  }
};

// Simple local cache for TMDb search results to speed up repeated queries
const TMDB_SEARCH_CACHE_KEY = 'tmdb_search_cache_v2';
const TMDB_SEARCH_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

const readTmdbSearchCache = (q) => {
  try {
    const raw = localStorage.getItem(TMDB_SEARCH_CACHE_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    const entry = obj[q];
    if (!entry) return null;
    if (Date.now() - entry.ts > TMDB_SEARCH_CACHE_TTL) return null;
    return entry.data;
  } catch (e) {
    return null;
  }
};

const writeTmdbSearchCache = (q, data) => {
  try {
    const raw = localStorage.getItem(TMDB_SEARCH_CACHE_KEY);
    const obj = raw ? JSON.parse(raw) : {};
    obj[q] = { ts: Date.now(), data };

    // Prune cache to avoid unbounded growth: keep max 200 entries and try to stay under ~900KB
    const MAX_ENTRIES = 200;
    const MAX_BYTES = 900 * 1024;

    const entries = Object.entries(obj).map(([key, val]) => ({ key, ts: val.ts }));
    if (entries.length > MAX_ENTRIES) {
      entries.sort((a, b) => a.ts - b.ts);
      for (let i = 0; i < entries.length - MAX_ENTRIES; i++) {
        delete obj[entries[i].key];
      }
    }

    // Ensure size limit by removing oldest until under threshold
    let jsonStr = JSON.stringify(obj);
    while (new Blob([jsonStr]).size > MAX_BYTES) {
      const remaining = Object.entries(obj).map(([k, v]) => ({ k, ts: v.ts })).sort((a, b) => a.ts - b.ts);
      if (remaining.length <= 1) break;
      delete obj[remaining[0].k];
      jsonStr = JSON.stringify(obj);
    }

    localStorage.setItem(TMDB_SEARCH_CACHE_KEY, jsonStr);
  } catch (e) {}
};

export const searchMovies = async (query, options = {}) => {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return [];

  const maxPages = Number.isFinite(options.maxPages) ? options.maxPages : 5;

  // Try local cache first (aggregated)
  const cached = readTmdbSearchCache('movie:' + q);
  if (cached) return cached;

  try {
    // Page 1
    const first = await axios.get('/api/search/movies', {
      params: { query, page: 1 },
      timeout: 8000,
    });
    const data1 = first.data || {};
    const totalPages = Math.max(1, Math.min(Number(data1.total_pages) || 1, maxPages));
    let all = Array.isArray(data1.results) ? data1.results : [];

    if (totalPages > 1) {
      const pages = [];
      for (let p = 2; p <= totalPages; p++) {
        pages.push(
          axios.get('/api/search/movies', {
            params: { query, page: p },
            timeout: 8000,
          }).then(r => (r.data?.results || [])).catch(() => [])
        );
      }
      const rest = await Promise.all(pages);
      rest.forEach(arr => { all = all.concat(arr); });
    }

    // Deduplicate by TMDb id
    const seen = new Set();
    const unique = all.filter(it => {
      const id = it && it.id;
      if (id == null) return false;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    writeTmdbSearchCache('movie:' + q, unique);
    return unique;
  } catch (error) {
    const fallback = readTmdbSearchCache('movie:' + q);
    if (fallback) return fallback;
    return handleApiError(error, []);
  }
};

export const searchTV = async (query, options = {}) => {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return [];

  const maxPages = Number.isFinite(options.maxPages) ? options.maxPages : 5;

  const cacheKey = 'tv:' + q;
  const cached = readTmdbSearchCache(cacheKey);
  if (cached) return cached;

  try {
    const first = await axios.get('/api/search/tv', {
      params: { query, page: 1 },
      timeout: 8000,
    });
    const data1 = first.data || {};
    const totalPages = Math.max(1, Math.min(Number(data1.total_pages) || 1, maxPages));
    let all = Array.isArray(data1.results) ? data1.results : [];

    if (totalPages > 1) {
      const pages = [];
      for (let p = 2; p <= totalPages; p++) {
        pages.push(
          axios.get('/api/search/tv', {
            params: { query, page: p },
            timeout: 8000,
          }).then(r => (r.data?.results || [])).catch(() => [])
        );
      }
      const rest = await Promise.all(pages);
      rest.forEach(arr => { all = all.concat(arr); });
    }

    const seen = new Set();
    const unique = all.filter(it => {
      const id = it && it.id;
      if (id == null) return false;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    writeTmdbSearchCache(cacheKey, unique);
    return unique;
  } catch (error) {
    // If we have a cached aggregated result, use it
    const fallbackCached = readTmdbSearchCache(cacheKey);
    if (fallbackCached) return fallbackCached;

    // Client-side fallback for a few very common series when TMDb is unavailable
    const STATIC_TV_FALLBACK = [
      {
        id: 1668,
        name: "Friends",
        first_air_date: "1994-09-22",
        poster_path: "/f496cm9enuEsZkSPzCwnTESEK5s.jpg",
        vote_average: 8.2,
        number_of_seasons: 10,
        number_of_episodes: 236,
      },
      {
        id: 1396,
        name: "Breaking Bad",
        first_air_date: "2008-01-20",
        poster_path: "/ggFHVNu6YYI5L9pCfOacjizRGt.jpg",
        vote_average: 8.7,
        number_of_seasons: 5,
        number_of_episodes: 62,
      },
      {
        id: 2316,
        name: "The Office",
        first_air_date: "2005-03-24",
        poster_path: "/qWnJzyZhyy74gjpSjIXWmuk0ifX.jpg",
        vote_average: 8.5,
        number_of_seasons: 9,
        number_of_episodes: 201,
      },
    ];

    const normalizedQuery = q;
    const matches = STATIC_TV_FALLBACK.filter((s) => {
      const n = String(s.name || '').toLowerCase();
      return n === normalizedQuery || n.includes(normalizedQuery) || normalizedQuery.includes(n);
    });

    if (matches.length > 0) {
      // Shape results like TMDb search results so callers can consume them
      const shaped = matches.map((m) => ({
        id: m.id,
        name: m.name,
        first_air_date: m.first_air_date,
        poster_path: m.poster_path,
        vote_average: m.vote_average,
        number_of_seasons: m.number_of_seasons,
        number_of_episodes: m.number_of_episodes,
      }));

      try {
        writeTmdbSearchCache(cacheKey, shaped);
      } catch (e) {
        // ignore cache failures
      }

      return shaped;
    }

    return handleApiError(error, []);
  }
};

export const getMovieDetails = async (id, options = {}) => {
  try {
    const response = await axios.get(`/api/movie/${id}`, {
      timeout: options.timeout || 8000,
    });
    return response.data;
  } catch (error) {
    return handleApiError(error, {
      id,
      title: "Movie Details Unavailable",
      overview: "Unable to load movie details. Check your connection.",
      poster_path: null,
      runtime: 120,
    });
  }
};

export const getTVDetails = async (id, options = {}) => {
  try {
    const params = {};
    if (options.minimal) params.minimal = true;
    const response = await axios.get(`/api/tv/${id}`, {
      params,
      timeout: options.timeout || 5000,
    });
    return response.data;
  } catch (error) {
    return handleApiError(error, {
      id,
      name: "TV Show Details Unavailable",
      overview: "Unable to load TV show details. Check your connection.",
      poster_path: null,
      number_of_seasons: 1,
      number_of_episodes: 10,
    });
  }
};

export const getTVSeason = async (id, season) => {
  try {
    const response = await axios.get(`/api/tv/${id}/season/${season}`, {
      timeout: 10000,
    });
    return response.data;
  } catch (error) {
    return handleApiError(error, {
      season_number: season,
      episodes: [],
      name: `Season ${season}`,
    });
  }
};

export const getTrendingMovies = async () => {
  try {
    const response = await axios.get(`/api/trending/movies`, { timeout: 15000 });
    return response.data.results || [];
  } catch (error) {
    return handleApiError(error, []);
  }
};

export const getTrendingTV = async () => {
  try {
    const response = await axios.get(`/api/trending/tv`, { timeout: 15000 });
    return response.data.results || [];
  } catch (error) {
    return handleApiError(error, []);
  }
};
