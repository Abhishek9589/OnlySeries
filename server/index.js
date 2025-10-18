import "dotenv/config";
import express from "express";
import cors from "cors";
import {
  searchMovies,
  searchTV,
  getMovieDetails,
  getTVDetails,
  getIMDbRating,
} from "./routes/tmdb-proxy.js";

export function createServer() {
  const app = express();

  // Middleware
  const rawFrontend = process.env.FRONTEND_URL?.trim() || "";
  const allowedOrigins = rawFrontend.split(",").map((s) => s.trim()).filter(Boolean);
  if (!allowedOrigins.includes("http://localhost:8080")) allowedOrigins.push("http://localhost:8080");
  if (!allowedOrigins.includes("http://127.0.0.1:8080")) allowedOrigins.push("http://127.0.0.1:8080");
  const corsOptions = {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    optionsSuccessStatus: 200,
  };
  app.use(cors(corsOptions));
  app.options("*", cors(corsOptions));
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
  app.get("/api/imdb-rating", getIMDbRating);

  return app;
}
