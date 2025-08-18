import { useState, useEffect, useCallback, memo } from "react";
import { Search, Loader2, X } from "lucide-react";
import {
  searchMovies,
  searchTV,
  getMovieDetails,
  getTVDetails,
  getIMDbRating,
} from "../lib/api";

const SearchBar = memo(function SearchBar({
  onAddBookmark,
  isVisible,
  bookmarks,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(null, args), delay);
    };
  };

  // Improved search similarity function
  const calculateSimilarity = (text, query) => {
    const textLower = text.toLowerCase().trim();
    const queryLower = query.toLowerCase().trim();

    // Exact match gets highest score
    if (textLower === queryLower) return 10;

    // Starts with query gets high score
    if (textLower.startsWith(queryLower)) return 8;

    // Contains query gets medium score
    if (textLower.includes(queryLower)) return 6;

    // Check for fuzzy matching (allowing for small differences)
    const words = queryLower.split(' ').filter(word => word.length > 0);
    let matchedWords = 0;

    words.forEach(word => {
      if (textLower.includes(word)) {
        matchedWords++;
      }
    });

    // Score based on how many words matched
    const wordScore = (matchedWords / words.length) * 4;
    return wordScore;
  };

  const searchMoviesAndSeries = async (query) => {
    // Trim and normalize the query
    const normalizedQuery = query.trim();
    if (!normalizedQuery || normalizedQuery.length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }

    setIsLoading(true);
    setShowResults(true);

    try {
      // Search both movies and TV shows in parallel
      const [moviesData, seriesData] = await Promise.all([
        searchMovies(normalizedQuery).catch((err) => {
          console.error("Movie search error:", err);
          return [];
        }),
        searchTV(normalizedQuery).catch((err) => {
          console.error("TV search error:", err);
          return [];
        }),
      ]);

      // Filter out items without posters and get top results
      const moviesWithPosters = (moviesData || [])
        .filter((movie) => movie.poster_path && movie.release_date)
        .slice(0, 4);

      const seriesWithPosters = (seriesData || [])
        .filter(
          (series) => series.poster_path && series.first_air_date,
        )
        .slice(0, 3);

      // Process results in parallel with better error handling
      const allResults = await Promise.allSettled([
        ...moviesWithPosters.map(async (movie) => {
          try {
            const year = new Date(movie.release_date).getFullYear().toString();

            // Get movie details and IMDb rating in parallel
            const [details, imdbRating] = await Promise.allSettled([
              getMovieDetails(movie.id),
              getIMDbRating(movie.title, year),
            ]);

            const movieDetails =
              details.status === "fulfilled" ? details.value : null;
            const rating =
              imdbRating.status === "fulfilled" ? imdbRating.value : "N/A";

            return {
              id: movie.id,
              title: movie.title,
              year,
              poster: `https://image.tmdb.org/t/p/w500${movie.poster_path}`,
              imdbRating: rating,
              type: "movie",
              runtime: movieDetails?.runtime || 120,
            };
          } catch (error) {
            console.error(`Error processing movie ${movie.title}:`, error);
            // Return basic movie info even if details fail
            return {
              id: movie.id,
              title: movie.title,
              year: new Date(movie.release_date).getFullYear().toString(),
              poster: `https://image.tmdb.org/t/p/w500${movie.poster_path}`,
              imdbRating: "N/A",
              type: "movie",
              runtime: 120,
            };
          }
        }),
        ...seriesWithPosters.map(async (series) => {
          try {
            const year = new Date(series.first_air_date)
              .getFullYear()
              .toString();

            // Get series details and IMDb rating in parallel
            const [details, imdbRating] = await Promise.allSettled([
              getTVDetails(series.id),
              getIMDbRating(series.name, year),
            ]);

            const seriesDetails =
              details.status === "fulfilled" ? details.value : null;
            const rating =
              imdbRating.status === "fulfilled" ? imdbRating.value : "N/A";

            return {
              id: series.id,
              title: series.name,
              year,
              poster: `https://image.tmdb.org/t/p/w500${series.poster_path}`,
              imdbRating: rating,
              type: "tv",
              seasons: seriesDetails?.number_of_seasons || 1,
              episodes: seriesDetails?.number_of_episodes || 10,
            };
          } catch (error) {
            console.error(`Error processing series ${series.name}:`, error);
            // Return basic series info even if details fail
            return {
              id: series.id,
              title: series.name,
              year: new Date(series.first_air_date).getFullYear().toString(),
              poster: `https://image.tmdb.org/t/p/w500${series.poster_path}`,
              imdbRating: "N/A",
              type: "tv",
              seasons: 1,
              episodes: 10,
            };
          }
        }),
      ]);

      // Filter successful results and sort by relevance
      const successfulResults = allResults
        .filter(
          (result) =>
            result.status === "fulfilled" && result.value !== null,
        )
        .map((result) => result.value)
        .filter((item) => {
          const isAlreadyAdded = bookmarks.some(bookmark =>
            Number(bookmark.id) === Number(item.id) && bookmark.type === item.type
          );
          return !isAlreadyAdded;
        }) // Hide already added items
        .map((item) => ({
          ...item,
          similarity: calculateSimilarity(item.title, normalizedQuery),
          ratingScore: item.imdbRating !== 'N/A' ? parseFloat(item.imdbRating) || 0 : 0
        }))
        .filter((item) => item.similarity > 0) // Only show items with some similarity
        .sort((a, b) => {
          // Primary sort: similarity score (higher = better match)
          if (a.similarity !== b.similarity) {
            return b.similarity - a.similarity;
          }

          // Secondary sort: IMDb rating (higher = better)
          if (a.ratingScore !== b.ratingScore) {
            return b.ratingScore - a.ratingScore;
          }

          // Tertiary sort: type preference (movies first)
          if (a.type !== b.type) {
            return a.type === "movie" ? -1 : 1;
          }

          // Final sort: alphabetical
          return a.title.localeCompare(b.title);
        });

      setResults(successfulResults);
    } catch (error) {
      console.error("Search error:", error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const debouncedSearch = useCallback(debounce(searchMoviesAndSeries, 400), []);

  useEffect(() => {
    debouncedSearch(searchTerm);
  }, [searchTerm, debouncedSearch]);

  const handleAddBookmark = (item) => {
    onAddBookmark(item);
    setSearchTerm("");
    setResults([]);
    setShowResults(false);
  };

  const clearSearch = () => {
    setSearchTerm("");
    setResults([]);
    setShowResults(false);
  };

  if (!isVisible) return null;

  return (
    <div className="w-full max-w-2xl mx-auto relative">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
        <input
          type="text"
          placeholder="Search for a movie or series..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-12 py-4 text-lg bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary transition-all shadow-lg"
        />
        {searchTerm && (
          <button
            onClick={clearSearch}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {showResults && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card/95 backdrop-blur-md border border-border/50 rounded-2xl overflow-hidden z-50 shadow-2xl max-h-96 overflow-y-auto custom-scrollbar">
          {isLoading ? (
            <div className="flex items-center justify-center p-6">
              <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
              <span className="text-muted-foreground">Searching...</span>
            </div>
          ) : results.length > 0 ? (
            <div className="divide-y divide-border/30">
              {results.map((item) => (
                <div
                  key={`${item.type}-${item.id}`}
                  onClick={() => handleAddBookmark(item)}
                  className="flex items-center p-4 hover:bg-accent/20 cursor-pointer transition-colors group"
                >
                  <div className="relative">
                    <img
                      src={item.poster}
                      alt={item.title}
                      className="w-12 h-18 object-cover rounded-lg mr-4 shadow-md"
                    />
                    <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                      {item.title}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{item.year}</span>
                      <span>•</span>
                      <span className="capitalize">{item.type}</span>
                      {item.imdbRating !== "N/A" && (
                        <>
                          <span>•</span>
                          <span className="text-primary">
                            ★ {item.imdbRating}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : searchTerm.length >= 2 ? (
            <div className="p-6 text-center text-muted-foreground">
              <p>No results found for "{searchTerm}"</p>
              <p className="text-sm mt-1">
                Try different keywords or check spelling
              </p>
            </div>
          ) : (
            <div className="p-6 text-center text-muted-foreground">
              <p>Type at least 2 characters to search</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export default SearchBar;
