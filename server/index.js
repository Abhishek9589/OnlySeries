import "dotenv/config";
import express from "express";
import cors from "cors";
import {
  searchMovies,
  searchTV,
  getMovieDetails,
  getTVDetails,
  getTVSeason,
  getIMDbRating,
  trendingMovies,
  trendingTV,
} from "./routes/tmdb-proxy.js";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health check for Render
  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "healthy", timestamp: new Date().toISOString() });
  });

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });


  // TMDb proxy routes
  app.get("/api/search/movies", searchMovies);
  app.get("/api/search/tv", searchTV);
  app.get("/api/movie/:id", getMovieDetails);
  app.get("/api/tv/:id", getTVDetails);
  app.get("/api/tv/:id/season/:season", getTVSeason);
  app.get("/api/imdb-rating", getIMDbRating);
  app.get("/api/trending/movies", trendingMovies);
  app.get("/api/trending/tv", trendingTV);

  return app;
}
