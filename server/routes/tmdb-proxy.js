import axios from "axios";

// TMDb API Keys from environment (single key required)
const TMDB_API_KEYS = [
  (process.env.TMDB_API_KEY)
].filter(k => k && k !== "");

if (TMDB_API_KEYS.length === 0) {
  console.warn('Warning: TMDB_API_KEY is not set in the environment. TMDb API requests will fail until configured.');
}

let currentTmdbKeyIndex = 0;
const failedTmdbKeys = new Set();

const getNextTmdbApiKey = () => {
  if (TMDB_API_KEYS.length === 0) return null;
  if (failedTmdbKeys.size >= TMDB_API_KEYS.length) {
    console.warn("All TMDb API keys exhausted, resetting failed keys set");
    failedTmdbKeys.clear();
    currentTmdbKeyIndex = 0;
  }

  for (let i = 0; i < TMDB_API_KEYS.length; i++) {
    const idx = (currentTmdbKeyIndex + i) % TMDB_API_KEYS.length;
    const key = TMDB_API_KEYS[idx];
    if (!failedTmdbKeys.has(key)) {
      currentTmdbKeyIndex = idx;
      return key;
    }
  }

  return TMDB_API_KEYS[0] || null;
};

const markTmdbKeyAsFailed = (key) => {
  failedTmdbKeys.add(key);
  console.log(`TMDb API key marked as failed. Failed keys: ${failedTmdbKeys.size}/${TMDB_API_KEYS.length}`);
  currentTmdbKeyIndex = (currentTmdbKeyIndex + 1) % TMDB_API_KEYS.length;
};

const tmdbGet = async (url, options = {}) => {
  if (TMDB_API_KEYS.length === 0) throw new Error('No TMDb API keys configured');
  let lastError = null;
  const maxAttempts = TMDB_API_KEYS.length;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const key = getNextTmdbApiKey();
    try {
      const params = Object.assign({}, options.params || {});
      params.api_key = key;
      const config = Object.assign({}, options, { params });
      const response = await axios.get(url, config);

      // Handle known TMDb error responses that imply the key is invalid or rate-limited
      if (response.status === 401 || response.status === 403) {
        markTmdbKeyAsFailed(key);
        lastError = new Error(`Status ${response.status}`);
        continue;
      }

      if (response.data && (response.data.status_code === 7 || response.data.status_code === 34)) {
        markTmdbKeyAsFailed(key);
        lastError = new Error(response.data.status_message || 'TMDb error');
        continue;
      }

      return response;
    } catch (err) {
      lastError = err;
      if (err.response?.status === 401 || err.response?.status === 403) {
        markTmdbKeyAsFailed(key);
        continue;
      }

      if (err.response?.status === 429 || (err.response?.data && /rate limit/i.test(err.response.data.status_message || ''))) {
        markTmdbKeyAsFailed(key);
        continue;
      }

      // For other errors, try next key
    }
  }

  throw lastError || new Error('No TMDb API keys available');
};

// OMDb API Keys array - use only OMDB_API_KEY_1..OMDB_API_KEY_5
const OMDB_API_KEYS = [
  process.env.OMDB_API_KEY_1,
  process.env.OMDB_API_KEY_2,
  process.env.OMDB_API_KEY_3,
  process.env.OMDB_API_KEY_4,
  process.env.OMDB_API_KEY_5,
].filter(key => key && key !== ""); // Remove empty keys

if (OMDB_API_KEYS.length === 0) {
  console.warn('Warning: No OMDb API keys configured. OMDb requests will return N/A until configured.');
}

// Track current key index and failed keys
let currentOmdbKeyIndex = 0;
const failedKeys = new Set();

// Function to get next available OMDb API key
const getNextOmdbApiKey = () => {
  // If all keys have failed, reset the failed set (maybe quotas reset)
  if (failedKeys.size >= OMDB_API_KEYS.length) {
    console.warn("All OMDb API keys exhausted, resetting failed keys set");
    failedKeys.clear();
    currentOmdbKeyIndex = 0;
  }

  // Find next available key
  for (let i = 0; i < OMDB_API_KEYS.length; i++) {
    const keyIndex = (currentOmdbKeyIndex + i) % OMDB_API_KEYS.length;
    const key = OMDB_API_KEYS[keyIndex];

    if (!failedKeys.has(key)) {
      currentOmdbKeyIndex = keyIndex;
      return key;
    }
  }

  // If no keys available, return first key as last resort
  return OMDB_API_KEYS[0];
};

// Function to mark a key as failed
const markOmdbKeyAsFailed = (key) => {
  failedKeys.add(key);
  console.log(`OMDb API key marked as failed. Failed keys: ${failedKeys.size}/${OMDB_API_KEYS.length}`);

  // Move to next key
  currentOmdbKeyIndex = (currentOmdbKeyIndex + 1) % OMDB_API_KEYS.length;
};

// Proxy for TMDb search movies
export const searchMovies = async (req, res) => {
  try {
    const { query, page } = req.query;
    if (!query) {
      return res.status(400).json({ error: "Query parameter is required" });
    }

    // If no TMDb API key configured, return a clear 503 so clients can surface a helpful message
    if (TMDB_API_KEYS.length === 0) {
      return res.status(503).json({ error: "TMDb API key not configured. Please set TMDB_API_KEY in the environment." });
    }

    const response = await tmdbGet(`https://api.themoviedb.org/3/search/movie`, {
      params: { query: query, page: page ? Number(page) : undefined },
    });

    res.json(response.data);
  } catch (error) {
    console.error("TMDb search movies error:", error);
    res.status(500).json({ error: "Failed to search movies" });
  }
};

// Proxy for TMDb search TV shows
export const searchTV = async (req, res) => {
  try {
    const { query, page } = req.query;
    if (!query) {
      return res.status(400).json({ error: "Query parameter is required" });
    }

    // If no TMDb API key configured, return a clear 503 so clients can surface a helpful message
    if (TMDB_API_KEYS.length === 0) {
      return res.status(503).json({ error: "TMDb API key not configured. Please set TMDB_API_KEY in the environment." });
    }

    const response = await tmdbGet(`https://api.themoviedb.org/3/search/tv`, {
      params: { query: query, page: page ? Number(page) : undefined },
    });

    res.json(response.data);
  } catch (error) {
    console.error("TMDb search TV error:", error);
    res.status(500).json({ error: "Failed to search TV shows" });
  }
};

// Proxy for TMDb trending movies and TV

// Proxy for TMDb movie details
export const getMovieDetails = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: "Movie ID is required" });
    }

    const response = await tmdbGet(`https://api.themoviedb.org/3/movie/${id}`, {
      params: { append_to_response: "external_ids" },
    });

    res.json(response.data);
  } catch (error) {
    console.error("TMDb movie details error:", error);
    res.status(500).json({ error: "Failed to get movie details" });
  }
};

// Proxy for TMDb TV details
export const getTVDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const minimal = req.query?.minimal === 'true';
    if (!id) {
      return res.status(400).json({ error: "TV show ID is required" });
    }

    const response = await tmdbGet(`https://api.themoviedb.org/3/tv/${id}`, {
      params: { append_to_response: "external_ids" },
    });

    const data = response.data || {};

    // If client requested minimal details (e.g., search preview), return quickly without expensive per-season fetches
    if (minimal) {
      return res.json(data);
    }

    // If seasons array exists, use it to compute a reliable number_of_seasons (exclude specials season 0)
    if (Array.isArray(data.seasons) && data.seasons.length > 0) {
      const seasonCountFromArray = data.seasons.filter(s => Number.isFinite(s.season_number) && s.season_number > 0).length;
      if (!Number.isFinite(data.number_of_seasons) || data.number_of_seasons < seasonCountFromArray) {
        data.number_of_seasons = seasonCountFromArray;
      }
    }

    // If number_of_episodes missing or zero, try to compute by summing seasons
    const needEpisodeCount = !Number.isFinite(data.number_of_episodes) || data.number_of_episodes <= 0;

    if (Array.isArray(data.seasons) && data.seasons.length > 0) {
      // Fetch season details for all seasons with a valid season_number (> 0);
      const seasonNumbers = data.seasons
        .map((s) => Number.isFinite(s.season_number) ? s.season_number : null)
        .filter((n) => n !== null && n > 0)
        .sort((a, b) => a - b);

      if (seasonNumbers.length > 0) {
        const seasonFetches = seasonNumbers.map(async (seasonNum) => {
          try {
            const seasonResp = await tmdbGet(`https://api.themoviedb.org/3/tv/${id}/season/${seasonNum}`);
            const seasonData = seasonResp.data || {};
            const episodeCount = Array.isArray(seasonData.episodes) ? seasonData.episodes.length : (Number.isFinite(seasonData.episode_count) ? seasonData.episode_count : null);
            return { season_number: seasonNum, episode_count: episode_count_safe(episodeCount), name: seasonData.name };
          } catch (err) {
            console.warn(`Failed to fetch season ${seasonNum} for TV ${id}:`, err.message || err);
            return { season_number: seasonNum, episode_count: null };
          }
        });

        const seasonsDetailed = await Promise.all(seasonFetches);
        // Compute total episodes from available season data
        const totalEpisodes = seasonsDetailed.reduce((sum, s) => sum + (Number.isFinite(s.episode_count) ? s.episode_count : 0), 0);

        if (needEpisodeCount && totalEpisodes > 0) {
          data.number_of_episodes = totalEpisodes;
        }

        // Replace seasons array with enriched info (preserve original fields where possible)
        data.seasons = data.seasons.map((s) => {
          const found = seasonsDetailed.find((d) => d.season_number === s.season_number);
          return Object.assign({}, s, found ? { episode_count: found.episode_count, name: found.name || s.name } : {});
        });

        // Ensure number_of_seasons reflects fetched season details (exclude specials)
        const countedSeasons = seasonsDetailed.filter(d => Number.isFinite(d.season_number) && d.season_number > 0).length;
        if (!Number.isFinite(data.number_of_seasons) || data.number_of_seasons < countedSeasons) {
          data.number_of_seasons = countedSeasons;
        }
      }
    }

    // Helper to normalize episode counts
    function episode_count_safe(v) {
      if (Number.isFinite(v) && v >= 0) return v;
      return null;
    }

    res.json(data);
  } catch (error) {
    console.error("TMDb TV details error:", error);
    res.status(500).json({ error: "Failed to get TV show details" });
  }
};

// Proxy for TMDb TV season

// Proxy for OMDb API with automatic key rotation
export const getIMDbRating = async (req, res) => {
  try {
    const { title, year, imdbId } = req.query;
    if (!title && !imdbId) {
      return res.status(400).json({ error: "Title or IMDb ID parameter is required" });
    }

    let lastError = null;
    let attemptsCount = 0;
    const maxAttempts = OMDB_API_KEYS.length; // Try all available keys

    while (attemptsCount < maxAttempts) {
      const currentKey = getNextOmdbApiKey();
      attemptsCount++;

      try {
        console.log(`Attempting OMDb API request (attempt ${attemptsCount}/${maxAttempts})`);

        const response = await axios.get(`https://www.omdbapi.com/`, {
          params: {
            apikey: currentKey,
            i: imdbId || undefined,
            t: imdbId ? undefined : title,
            y: imdbId ? undefined : year,
          },
          timeout: 5000, // 5 second timeout
        });

        // Check if the response indicates an API limit issue
        if (response.data.Response === "False" &&
            (response.data.Error?.includes("Request limit reached") ||
             response.data.Error?.includes("Invalid API key") ||
             response.status === 401)) {

          console.log(`OMDb API key failed: ${response.data.Error}`);
          markOmdbKeyAsFailed(currentKey);
          lastError = new Error(`API Key failed: ${response.data.Error}`);
          continue; // Try next key
        }

        // Success - return only the IMDb rating (do not expose other OMDb fields)
        return res.json({
          imdbRating: response.data.imdbRating || "N/A",
        });

      } catch (error) {
        console.error(`OMDb API error:`, error.message);

        // If it's a 401 or 403, mark key as failed
        if (error.response?.status === 401 || error.response?.status === 403) {
          markOmdbKeyAsFailed(currentKey);
        }

        lastError = error;
        // Continue to try next key
      }
    }

    // All attempts failed
    console.error(`All OMDb API attempts failed. Last error:`, lastError?.message);
    res.json({
      imdbRating: "N/A",
    });

  } catch (error) {
    console.error("OMDb API unexpected error:", error);
    res.json({ imdbRating: "N/A" });
  }
};
