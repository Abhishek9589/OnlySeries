import { RequestHandler } from "express";
import axios from "axios";

const TMDB_API_KEY = "9f5749f3d13f732d1ec069bde976daba";
const OMDB_API_KEY = "ed102618";

// Proxy for TMDb search movies
export const searchMovies: RequestHandler = async (req, res) => {
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
export const searchTV: RequestHandler = async (req, res) => {
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
export const getMovieDetails: RequestHandler = async (req, res) => {
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
export const getTVDetails: RequestHandler = async (req, res) => {
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
export const getTVSeason: RequestHandler = async (req, res) => {
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

// Proxy for OMDb API
export const getIMDbRating: RequestHandler = async (req, res) => {
  try {
    const { title, year } = req.query;
    if (!title) {
      return res.status(400).json({ error: "Title parameter is required" });
    }

    const response = await axios.get(`https://www.omdbapi.com/`, {
      params: {
        apikey: OMDB_API_KEY,
        t: title,
        y: year,
      },
    });

    res.json({
      imdbRating: response.data.imdbRating || "N/A",
      imdbID: response.data.imdbID,
    });
  } catch (error) {
    console.error("OMDb API error:", error);
    res.json({ imdbRating: "N/A", imdbID: null });
  }
};
