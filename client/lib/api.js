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
export const getIMDbRating = async (title, year) => {
  try {
    const response = await axios.get("/api/imdb-rating", {
      params: { title, year },
      timeout: 10000, // 10 second timeout
    });
    return response.data.imdbRating || "N/A";
  } catch (error) {
    return handleApiError(error, "N/A");
  }
};

export const searchMovies = async (query) => {
  try {
    const response = await axios.get("/api/search/movies", {
      params: { query },
      timeout: 15000, // 15 second timeout for search
    });
    return response.data.results || [];
  } catch (error) {
    return handleApiError(error, []);
  }
};

export const searchTV = async (query) => {
  try {
    const response = await axios.get("/api/search/tv", {
      params: { query },
      timeout: 15000, // 15 second timeout for search
    });
    return response.data.results || [];
  } catch (error) {
    return handleApiError(error, []);
  }
};

export const getMovieDetails = async (id) => {
  try {
    const response = await axios.get(`/api/movie/${id}`, {
      timeout: 10000,
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

export const getTVDetails = async (id) => {
  try {
    const response = await axios.get(`/api/tv/${id}`, {
      timeout: 10000,
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
