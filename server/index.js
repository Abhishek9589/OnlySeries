import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo.js";
import {
  searchMulti,
  getMovieDetails,
  getTVDetails,
  getSeasonDetails,
} from "./routes/tmdb.js";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    res.json({ message: "Hello from Express server v2!" });
  });

  app.get("/api/demo", handleDemo);

  // TMDB proxy routes
  app.get("/api/tmdb/search", searchMulti);
  app.get("/api/tmdb/movie/:movieId", getMovieDetails);
  app.get("/api/tmdb/tv/:tvId", getTVDetails);
  app.get("/api/tmdb/tv/:tvId/season/:seasonNumber", getSeasonDetails);

  return app;
}
