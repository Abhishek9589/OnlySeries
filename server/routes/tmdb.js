const TMDB_API_KEY = "9f5749f3d13f732d1ec069bde976daba";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

// Search movies and TV shows
export const searchMulti = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({ error: "Query parameter is required" });
    }

    const url = `${TMDB_BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=en-US&page=1`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `TMDB API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("TMDB search error:", error);
    res
      .status(500)
      .json({ error: "Failed to search movies", details: error.message });
  }
};

// Get movie details
export const getMovieDetails = async (req, res) => {
  try {
    const { movieId } = req.params;

    const url = `${TMDB_BASE_URL}/movie/${movieId}?api_key=${TMDB_API_KEY}&language=en-US`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `TMDB API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("TMDB movie details error:", error);
    res
      .status(500)
      .json({ error: "Failed to get movie details", details: error.message });
  }
};

// Get TV details
export const getTVDetails = async (req, res) => {
  try {
    const { tvId } = req.params;

    const url = `${TMDB_BASE_URL}/tv/${tvId}?api_key=${TMDB_API_KEY}&language=en-US`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `TMDB API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("TMDB TV details error:", error);
    res
      .status(500)
      .json({ error: "Failed to get TV details", details: error.message });
  }
};

// Get season details
export const getSeasonDetails = async (req, res) => {
  try {
    const { tvId, seasonNumber } = req.params;

    const url = `${TMDB_BASE_URL}/tv/${tvId}/season/${seasonNumber}?api_key=${TMDB_API_KEY}&language=en-US`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `TMDB API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("TMDB season details error:", error);
    res
      .status(500)
      .json({ error: "Failed to get season details", details: error.message });
  }
};
