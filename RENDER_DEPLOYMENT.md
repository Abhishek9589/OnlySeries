# Render Deployment Guide

This app is fully configured for Render deployment with npm.

## Quick Deploy Settings for Render

### Basic Settings
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Node Version**: 18+ (latest recommended)

### Environment Variables Required
Add these environment variables in Render dashboard:

```
NODE_ENV=production
TMDB_API_KEY=your_tmdb_api_key
OMDB_API_KEY_1=your_omdb_key_1
OMDB_API_KEY_2=your_omdb_key_2
OMDB_API_KEY_3=your_omdb_key_3
OMDB_API_KEY_4=your_omdb_key_4
OMDB_API_KEY_5=your_omdb_key_5
```

### Health Check
- **Health Check Path**: `/health`

## What's Been Configured

✅ **npm-first**: Removed pnpm packageManager field and lock file  
✅ **Port binding**: Server binds to `0.0.0.0` for Render compatibility  
✅ **Health endpoint**: `/health` endpoint for Render health checks  
✅ **Production build**: Optimized build process for client and server  
✅ **Static files**: Proper serving of React SPA with routing support  
✅ **API proxy**: TMDb and OMDb API endpoints with fallback keys  
✅ **Environment**: Production-ready configuration  

## Deploy Steps

1. **Connect Repository**: Link your GitHub repo to Render
2. **Service Type**: Web Service
3. **Build Command**: `npm install && npm run build`
4. **Start Command**: `npm start`
5. **Add Environment Variables**: Copy the API keys from your .env
6. **Deploy**: Click deploy!

## API Endpoints

- `GET /health` - Health check
- `GET /api/ping` - Test endpoint
- `GET /api/search/movies?query=term` - Search movies
- `GET /api/search/tv?query=term` - Search TV shows
- `GET /api/movie/:id` - Get movie details
- `GET /api/tv/:id` - Get TV show details
- `GET /api/tv/:id/season/:season` - Get TV season
- `GET /api/imdb-rating?title=name&year=2023` - Get IMDb rating

## Notes

- The app serves the React SPA for all non-API routes
- Multiple OMDb API keys provide automatic fallback
- Server gracefully handles shutdowns
- Static assets are served from `dist/spa`
