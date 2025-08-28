import axios from "axios";

// TMDb API Key from environment
const TMDB_API_KEY = process.env.TMDB_API_KEY || "9f5749f3d13f732d1ec069bde976daba";

// OMDb API Keys array for automatic rotation/fallback
const OMDB_API_KEYS = [
  process.env.OMDB_API_KEY_1 || "ed102618",
  process.env.OMDB_API_KEY_2 || "4bf3c9e5",
  process.env.OMDB_API_KEY_3 || "b78032a1",
  process.env.OMDB_API_KEY_4 || "73943cc2",
  process.env.OMDB_API_KEY_5 || "247ecdc6"
].filter(key => key && key !== ""); // Remove empty keys

// Track current key index and failed keys
let currentOmdbKeyIndex = 0;
const failedKeys = new Set();

// Function to get next available OMDb API key
const getNextOmdbApiKey = () => {
  // If all keys have failed, reset the failed set (maybe quotas reset)
  if (failedKeys.size >= OMDB_API_KEYS.length) {
    console.log("All OMDb API keys exhausted, resetting failed keys set");
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
  console.log(`OMDb API key ${key.substring(0, 4)}... marked as failed. Failed keys: ${failedKeys.size}/${OMDB_API_KEYS.length}`);

  // Move to next key
  currentOmdbKeyIndex = (currentOmdbKeyIndex + 1) % OMDB_API_KEYS.length;
};

// Proxy for TMDb search movies
export const searchMovies = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ error: "Query parameter is required" });
    }

    const response = await axios.get(
      `https://api.themoviedb.org/3/search/movie`,
      {
        params: {
          api_key: TMDB_API_KEY,
          query: query,
        },
      },
    );

    res.json(response.data);
  } catch (error) {
    console.error("TMDb search movies error:", error);
    res.status(500).json({ error: "Failed to search movies" });
  }
};

// Proxy for TMDb search TV shows
export const searchTV = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ error: "Query parameter is required" });
    }

    const response = await axios.get(`https://api.themoviedb.org/3/search/tv`, {
      params: {
        api_key: TMDB_API_KEY,
        query: query,
      },
    });

    res.json(response.data);
  } catch (error) {
    console.error("TMDb search TV error:", error);
    res.status(500).json({ error: "Failed to search TV shows" });
  }
};

// Proxy for TMDb movie details
export const getMovieDetails = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: "Movie ID is required" });
    }

    const response = await axios.get(
      `https://api.themoviedb.org/3/movie/${id}`,
      {
        params: {
          api_key: TMDB_API_KEY,
        },
      },
    );

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
    if (!id) {
      return res.status(400).json({ error: "TV show ID is required" });
    }

    const response = await axios.get(`https://api.themoviedb.org/3/tv/${id}`, {
      params: {
        api_key: TMDB_API_KEY,
      },
    });

    res.json(response.data);
  } catch (error) {
    console.error("TMDb TV details error:", error);
    res.status(500).json({ error: "Failed to get TV show details" });
  }
};

// Proxy for TMDb TV season
export const getTVSeason = async (req, res) => {
  try {
    const { id, season } = req.params;
    if (!id || !season) {
      return res
        .status(400)
        .json({ error: "TV show ID and season number are required" });
    }

    const response = await axios.get(
      `https://api.themoviedb.org/3/tv/${id}/season/${season}`,
      {
        params: {
          api_key: TMDB_API_KEY,
        },
      },
    );

    res.json(response.data);
  } catch (error) {
    console.error("TMDb TV season error:", error);
    res.status(500).json({ error: "Failed to get TV season details" });
  }
};

// Proxy for OMDb API with automatic key rotation
export const getIMDbRating = async (req, res) => {
  try {
    const { title, year } = req.query;
    if (!title) {
      return res.status(400).json({ error: "Title parameter is required" });
    }

    let lastError = null;
    let attemptsCount = 0;
    const maxAttempts = Math.min(OMDB_API_KEYS.length, 3); // Try up to 3 different keys

    while (attemptsCount < maxAttempts) {
      const currentKey = getNextOmdbApiKey();
      attemptsCount++;

      try {
        console.log(`Attempting OMDb API request with key ${currentKey.substring(0, 4)}... (attempt ${attemptsCount}/${maxAttempts})`);

        const response = await axios.get(`https://www.omdbapi.com/`, {
          params: {
            apikey: currentKey,
            t: title,
            y: year,
          },
          timeout: 5000, // 5 second timeout
        });

        // Check if the response indicates an API limit issue
        if (response.data.Response === "False" &&
            (response.data.Error?.includes("Request limit reached") ||
             response.data.Error?.includes("Invalid API key") ||
             response.status === 401)) {

          console.log(`OMDb API key ${currentKey.substring(0, 4)}... failed: ${response.data.Error}`);
          markOmdbKeyAsFailed(currentKey);
          lastError = new Error(`API Key failed: ${response.data.Error}`);
          continue; // Try next key
        }

        // Success - return the result
        console.log(`OMDb API success with key ${currentKey.substring(0, 4)}...`);
        return res.json({
          imdbRating: response.data.imdbRating || "N/A",
          imdbID: response.data.imdbID,
          apiKeyUsed: currentKey.substring(0, 4) + "..." // For debugging
        });

      } catch (error) {
        console.error(`OMDb API error with key ${currentKey.substring(0, 4)}...:`, error.message);

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
      imdbID: null,
      error: "All API keys exhausted"
    });

  } catch (error) {
    console.error("OMDb API unexpected error:", error);
    res.json({ imdbRating: "N/A", imdbID: null });
  }
};
