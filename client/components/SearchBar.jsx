import { useState, useEffect, useCallback, memo, useRef } from "react";
import { Search, Loader2, X, WifiOff } from "lucide-react";
import { useOffline } from "../hooks/use-offline";
import FallbackImage from "./FallbackImage";
import {
  searchMovies,
  searchTV,
  getMovieDetails,
  getTVDetails,
  getIMDbRating,
} from "../lib/api";

const LS_SELECTION_BOOSTS = "selectionBoosts";
const LS_SEARCH_CACHE = "searchCacheV1";
const LS_MISSES = "searchMisses";

const SearchBar = memo(function SearchBar({
  onAddBookmark,
  isVisible,
  bookmarks,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [activeTab, setActiveTab] = useState("all"); // all | tv | movie
  const [visibleCount, setVisibleCount] = useState(10);
    const isOffline = useOffline();

  // Refs to avoid stale closures in async handlers
  const bookmarksRef = useRef(bookmarks);
  const offlineRef = useRef(isOffline);
  const requestSeqRef = useRef(0);

  useEffect(() => { bookmarksRef.current = bookmarks; }, [bookmarks]);
  useEffect(() => { offlineRef.current = isOffline; }, [isOffline]);

  const getSelectionBoosts = () => {
    try {
      const raw = localStorage.getItem(LS_SELECTION_BOOSTS);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };
  const incrementSelectionBoost = (key) => {
    try {
      const map = getSelectionBoosts();
      map[key] = (map[key] || 0) + 1;
      localStorage.setItem(LS_SELECTION_BOOSTS, JSON.stringify(map));
    } catch {}
  };

  const getCachedSearch = (q) => {
    try {
      const raw = localStorage.getItem(LS_SEARCH_CACHE);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      const entry = obj[q];
      if (!entry) return null;
      const now = Date.now();
      if (now - entry.ts > 60 * 60 * 1000) return null; // 1h TTL
      return entry.data;
    } catch { return null; }
  };
  const setCachedSearch = (q, data) => {
    try {
      const raw = localStorage.getItem(LS_SEARCH_CACHE);
      const obj = raw ? JSON.parse(raw) : {};
      obj[q] = { ts: Date.now(), data };
      localStorage.setItem(LS_SEARCH_CACHE, JSON.stringify(obj));
    } catch {}
  };


  // Improved search similarity function with selection boosts
  const calculateSimilarity = (text, query, itemKey) => {
    const textLower = text.toLowerCase().trim();
    const queryLower = query.toLowerCase().trim();

    if (textLower === queryLower) return 12;
    if (textLower.startsWith(queryLower)) return 10;
    if (textLower.includes(queryLower)) return 8;

    const words = queryLower.split(' ').filter(word => word.length > 0);
    let matchedWords = 0;
    for (const word of words) if (textLower.includes(word)) matchedWords++;
    let wordScore = (matchedWords / Math.max(words.length, 1)) * 6;

    const boosts = getSelectionBoosts();
    const freq = boosts[itemKey] || 0; // boost frequently selected entities
    const freqBoost = Math.min(freq, 5) * 0.5; // cap boost

    return wordScore + freqBoost;
  };

  const toUnifiedItem = (entry) => {
    if (entry.kind === "movie") {
      const movie = entry.raw;
      return {
        id: movie.id,
        title: movie.title,
        year: movie.release_date ? new Date(movie.release_date).getFullYear().toString() : "",
        poster: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
        imdbRating: "N/A",
        type: "movie",
        runtime: 120,
      };
    }
    const series = entry.raw;
    return {
      id: series.id,
      title: series.name,
      year: series.first_air_date ? new Date(series.first_air_date).getFullYear().toString() : "",
      poster: series.poster_path ? `https://image.tmdb.org/t/p/w500${series.poster_path}` : null,
      imdbRating: "N/A",
      type: "tv",
      seasons: 1,
      episodes: 10,
    };
  };

  const searchMoviesAndSeries = async (query, requestId) => {
    const normalizedQuery = query.trim();
    if (!normalizedQuery || normalizedQuery.length < 2) {
      setResults([]);
      setShowResults(false);
      setHasError(false);
      return;
    }

    if (offlineRef.current) {
      setResults([]);
      setShowResults(true);
      setHasError(true);
      setIsLoading(false);
      return;
    }

    const cached = getCachedSearch(normalizedQuery);
    if (cached && requestId === requestSeqRef.current) {
      setResults(cached);
      setShowResults(true);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setShowResults(true);
    setHasError(false);

    try {
      const [moviesData, seriesData] = await Promise.all([
        searchMovies(normalizedQuery).catch(() => []),
        searchTV(normalizedQuery).catch(() => []),
      ]);

      const moviesWithPosters = (moviesData || [])
        .filter((movie) => movie.poster_path && movie.release_date)
        .map((m) => ({ kind: "movie", raw: m }));
      const seriesWithPosters = (seriesData || [])
        .filter((series) => series.poster_path && series.first_air_date)
        .map((s) => ({ kind: "tv", raw: s }));

      const MAX_TOTAL = 50; // allow more than top-10
      const combinedEntries = [...moviesWithPosters, ...seriesWithPosters].slice(0, MAX_TOTAL);

      const MAX_DETAILED = 7;
      const detailed = combinedEntries.slice(0, MAX_DETAILED);
      const basic = combinedEntries.slice(MAX_DETAILED);

      const detailedPromises = detailed.map(async (entry) => {
        if (entry.kind === "movie") {
          const movie = entry.raw;
          try {
            const year = new Date(movie.release_date).getFullYear().toString();
            const [details, imdbRating] = await Promise.allSettled([
              getMovieDetails(movie.id),
              getIMDbRating(movie.title, year),
            ]);
            const movieDetails = details.status === "fulfilled" ? details.value : null;
            const rating = imdbRating.status === "fulfilled" ? imdbRating.value : "N/A";
            return {
              id: movie.id,
              title: movie.title,
              year,
              poster: `https://image.tmdb.org/t/p/w500${movie.poster_path}`,
              imdbRating: rating,
              type: "movie",
              runtime: movieDetails?.runtime || 120,
            };
          } catch {
            return toUnifiedItem({ kind: "movie", raw: movie });
          }
        } else {
          const series = entry.raw;
          try {
            const year = new Date(series.first_air_date).getFullYear().toString();
            const [details, imdbRating] = await Promise.allSettled([
              getTVDetails(series.id),
              getIMDbRating(series.name, year),
            ]);
            const seriesDetails = details.status === "fulfilled" ? details.value : null;
            const rating = imdbRating.status === "fulfilled" ? imdbRating.value : "N/A";
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
          } catch {
            return toUnifiedItem({ kind: "tv", raw: series });
          }
        }
      });

      const detailedResultsSettled = await Promise.allSettled(detailedPromises);
      const detailedResults = detailedResultsSettled
        .filter((r) => r.status === "fulfilled" && r.value)
        .map((r) => r.value);

      const basicResults = basic.map(toUnifiedItem);
      const allResultsRaw = [...detailedResults, ...basicResults];

      const successfulResults = allResultsRaw
        .filter((item) => {
          const isAlreadyAdded = bookmarksRef.current.some((bookmark) =>
            Number(bookmark.id) === Number(item.id) && bookmark.type === item.type
          );
          return !isAlreadyAdded;
        })
        .map((item) => {
          const key = `${item.type}:${item.id}`;
          return {
            ...item,
            similarity: calculateSimilarity(item.title, normalizedQuery, key),
            ratingScore: item.imdbRating !== "N/A" ? parseFloat(item.imdbRating) || 0 : 0,
          };
        })
        .filter((item) => item.similarity > 0)
        .sort((a, b) => {
          if (a.similarity !== b.similarity) return b.similarity - a.similarity;
          if (a.ratingScore !== b.ratingScore) return b.ratingScore - a.ratingScore;
          if (a.type !== b.type) return a.type === "movie" ? -1 : 1;
          return a.title.localeCompare(b.title);
        });

      if (requestId === requestSeqRef.current) {
        setResults(successfulResults);
        setCachedSearch(normalizedQuery, successfulResults);
      }
    } catch (error) {
      console.error("Search error:", error);
      setResults([]);
    } finally {
      if (requestId === requestSeqRef.current) {
        setIsLoading(false);
      }
    }
  };

  // Debounced search without stale closures
  useEffect(() => {
    const normalized = (searchTerm || "").trim();
    if (normalized.length < 2) {
      setResults([]);
      setShowResults(false);
      setHasError(false);
      setIsLoading(false);
      setVisibleCount(10);
      return;
    }

    setShowResults(true);
    setHasError(false);
    setIsLoading(true);

    const id = ++requestSeqRef.current;
    const timer = setTimeout(() => {
      if (offlineRef.current) {
        if (id === requestSeqRef.current) {
          setResults([]);
          setHasError(true);
          setIsLoading(false);
        }
        return;
      }
      searchMoviesAndSeries(normalized, id);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchTerm]);


  const handleAddBookmark = (item) => {
    onAddBookmark(item);
    const key = `${item.type}:${item.id}`;
    incrementSelectionBoost(key);
    setSearchTerm("");
    setResults([]);
    setShowResults(false);
  };

  const clearSearch = () => {
    setSearchTerm("");
    setResults([]);
    setShowResults(false);
  };

  const filteredByTab = results.filter((r) =>
    activeTab === "all" ? true : activeTab === "tv" ? r.type === "tv" : r.type === "movie"
  );
  const visibleResults = filteredByTab.slice(0, visibleCount);

  const onNoResultsLogMiss = useCallback(() => {
    try {
      const raw = localStorage.getItem(LS_MISSES);
      const arr = raw ? JSON.parse(raw) : [];
      arr.push({ q: (searchTerm || "").trim(), ts: Date.now() });
      localStorage.setItem(LS_MISSES, JSON.stringify(arr.slice(-200)));
    } catch {}
  }, [searchTerm]);

  if (!isVisible) return null;

  return (
    <div className="w-full max-w-2xl mx-auto relative">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
        <input
          type="text"
          placeholder="Search for a movie or series..."
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setVisibleCount(10); }}
          className="w-full pl-12 pr-12 py-3 sm:py-4 text-base sm:text-lg bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary transition-all shadow-lg"
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
        <div className="absolute top-full left-0 right-0 mt-2 bg-card/95 backdrop-blur-md border border-border/50 rounded-2xl overflow-hidden z-50 shadow-2xl max-h-[28rem] overflow-y-auto custom-scrollbar">
          {isLoading ? (
            <div className="flex items-center justify-center p-6">
              <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
              <span className="text-muted-foreground">Searching...</span>
            </div>
          ) : hasError && offlineRef.current ? (
            <div className="p-6 text-center text-muted-foreground">
              <WifiOff className="w-8 h-8 mx-auto mb-3 opacity-50" />
              <p className="font-medium">You're offline</p>
              <p className="text-sm mt-1">Search requires an internet connection</p>
            </div>
          ) : results.length > 0 ? (
            <div>
              <div className="flex items-center gap-2 p-3 border-b border-border/30 sticky top-0 bg-card/95 backdrop-blur-md z-10">
                <span className="text-sm text-muted-foreground">Results</span>
                <div className="ml-auto flex gap-2">
                  <button onClick={() => { setActiveTab("all"); setVisibleCount(10); }} className={`px-3 py-1 text-sm rounded-full border ${activeTab==='all' ? 'bg-primary text-primary-foreground' : 'bg-transparent text-foreground/80'}`}>All ({results.length})</button>
                  <button onClick={() => { setActiveTab("tv"); setVisibleCount(10); }} className={`px-3 py-1 text-sm rounded-full border ${activeTab==='tv' ? 'bg-primary text-primary-foreground' : 'bg-transparent text-foreground/80'}`}>TV ({results.filter(r=>r.type==='tv').length})</button>
                  <button onClick={() => { setActiveTab("movie"); setVisibleCount(10); }} className={`px-3 py-1 text-sm rounded-full border ${activeTab==='movie' ? 'bg-primary text-primary-foreground' : 'bg-transparent text-foreground/80'}`}>Movies ({results.filter(r=>r.type==='movie').length})</button>
                </div>
              </div>
              <div className="divide-y divide-border/30">
                {visibleResults.map((item) => (
                  <div
                    key={`${item.type}-${item.id}`}
                    onClick={() => handleAddBookmark(item)}
                    className="flex items-center p-4 hover:bg-accent/20 cursor-pointer transition-colors group"
                  >
                    <div className="relative mr-4">
                      <FallbackImage
                        src={item.poster}
                        alt={item.title}
                        type={item.type}
                        className="w-12 h-18 object-cover rounded-lg shadow-md"
                        fallbackClassName="w-12 h-18 rounded-lg text-xs"
                      />
                      <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                        {item.title}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {item.year && <span className="px-2 py-0.5 rounded-full border border-border/50 bg-background/40">{item.year}</span>}
                        <span className="capitalize">{item.type}</span>
                        {item.imdbRating !== "N/A" && (
                          <span className="text-primary">★ {item.imdbRating}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {filteredByTab.length > visibleCount && (
                <div className="p-3 text-center border-t border-border/30 bg-card/95">
                  <button onClick={() => setVisibleCount((c) => c + 10)} className="text-sm text-primary hover:underline">
                    Show more
                  </button>
                </div>
              )}
            </div>
          ) : searchTerm.length >= 2 ? (
            <div className="p-6 text-center text-muted-foreground">
              <p>No results found for "{searchTerm}"</p>
              <p className="text-sm mt-1">Try different keywords or check spelling</p>
              {onNoResultsLogMiss()}
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
