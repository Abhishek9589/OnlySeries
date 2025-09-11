import axios from "axios";

// Enhanced error handling with offline detection
const handleApiError = (error, fallback = null) => {
  if (!navigator.onLine) {
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
const TMDB_SEARCH_CACHE_KEY = 'tmdb_search_cache_v1';
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
    localStorage.setItem(TMDB_SEARCH_CACHE_KEY, JSON.stringify(obj));
  } catch (e) {}
};

export const searchMovies = async (query) => {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return [];

  // Try local cache first
  const cached = readTmdbSearchCache('movie:' + q);
  if (cached) return cached;

  try {
    const response = await axios.get('/api/search/movies', {
      params: { query },
      timeout: 8000,
    });
    const results = response.data.results || [];
    writeTmdbSearchCache('movie:' + q, results);
    return results;
  } catch (error) {
    // Return cache if network fails
    const fallback = readTmdbSearchCache('movie:' + q);
    if (fallback) return fallback;
    return handleApiError(error, []);
  }
};

export const searchTV = async (query) => {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return [];

  // Try local cache first
  const cached = readTmdbSearchCache('tv:' + q);
  if (cached) return cached;

  try {
    const response = await axios.get('/api/search/tv', {
      params: { query },
      timeout: 8000,
    });
    const results = response.data.results || [];
    writeTmdbSearchCache('tv:' + q, results);
    return results;
  } catch (error) {
    const fallback = readTmdbSearchCache('tv:' + q);
    if (fallback) return fallback;
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
