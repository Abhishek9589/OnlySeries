import axios from "axios";

// Use local API proxy endpoints instead of direct external API calls
export const getIMDbRating = async (
  title: string,
  year: string,
): Promise<string> => {
  try {
    const response = await axios.get("/api/imdb-rating", {
      params: { title, year },
    });
    return response.data.imdbRating || "N/A";
  } catch (error) {
    console.warn("OMDb API error:", error);
    return "N/A";
  }
};

export const searchMovies = async (query: string) => {
  const response = await axios.get("/api/search/movies", {
    params: { query },
  });
  return response.data.results;
};

export const searchTV = async (query: string) => {
  const response = await axios.get("/api/search/tv", {
    params: { query },
  });
  return response.data.results;
};

export const getMovieDetails = async (id: number) => {
  const response = await axios.get(`/api/movie/${id}`);
  return response.data;
};

export const getTVDetails = async (id: number) => {
  const response = await axios.get(`/api/tv/${id}`);
  return response.data;
};

export const getTVSeason = async (id: number, season: number) => {
  const response = await axios.get(`/api/tv/${id}/season/${season}`);
  return response.data;
};
