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

// Cache verified ratings across searches to avoid repeated OMDb calls
const imdbVerifyCache = new Map();

const LS_SELECTION_BOOSTS = "selectionBoosts";
const LS_SEARCH_CACHE = "searchCacheV2";
const LS_MISSES = "searchMisses";

const SearchBar = memo(function SearchBar({
  onAddBookmark,
  isVisible,
  bookmarks,
  onBulkFranchise,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [activeTab, setActiveTab] = useState("tv"); // tv | movie
  const [visibleCount, setVisibleCount] = useState(10);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [verifiedRatings, setVerifiedRatings] = useState({});
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
  const stripDiacritics = (s) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '');
  const norm = (s) => stripDiacritics(String(s || '').toLowerCase().trim());
  const calculateSimilarity = (text, query, itemKey) => {
    const t = norm(text);
    const q = norm(query);

    const ALIASES = {
      'pokemon': ['pocket monsters'],
    };

    const altQueries = [q, ...(ALIASES[q] || []).map(norm)];

    if (altQueries.some((qq) => t === qq)) return 12;
    if (altQueries.some((qq) => t.startsWith(qq))) return 10;
    if (altQueries.some((qq) => t.includes(qq))) return 8;

    const words = q.split(' ').filter((w) => w);
    let matchedWords = 0;
    for (const word of words) if (t.includes(word)) matchedWords++;
    let wordScore = (matchedWords / Math.max(words.length, 1)) * 6;

    const boosts = getSelectionBoosts();
    const freq = boosts[itemKey] || 0;
    const freqBoost = Math.min(freq, 5) * 0.5;

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
        imdbRating: typeof movie.vote_average === 'number' ? String(movie.vote_average.toFixed(1)) : "N/A",
        type: "movie",
        runtime: movie.runtime || 120,
      };
    }
    const series = entry.raw;
    return {
      id: series.id,
      title: series.name,
      year: series.first_air_date ? new Date(series.first_air_date).getFullYear().toString() : "",
      poster: series.poster_path ? `https://image.tmdb.org/t/p/w500${series.poster_path}` : null,
      imdbRating: typeof series.vote_average === 'number' ? String(series.vote_average.toFixed(1)) : "N/A",
      type: "tv",
      seasons: series.number_of_seasons || 1,
      episodes: series.number_of_episodes || 10,
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
      const filteredCached = cached.filter((item) => {
        const isAlreadyAdded = bookmarksRef.current.some(
          (bookmark) => Number(bookmark.id) === Number(item.id) && bookmark.type === item.type
        );
        return !isAlreadyAdded;
      });
      setResults(filteredCached);
      setShowResults(true);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setShowResults(true);
    setHasError(false);

    try {
      const [moviesData, seriesData] = await Promise.all([
        searchMovies(normalizedQuery, { maxPages: 10 }).catch(() => []),
        searchTV(normalizedQuery, { maxPages: 10 }).catch(() => []),
      ]);

      const moviesEntries = (moviesData || []).map((m) => ({ kind: "movie", raw: m }));
      const seriesEntries = (seriesData || []).map((s) => ({ kind: "tv", raw: s }));

      const MAX_TOTAL = 200;
      const combinedEntries = [...moviesEntries, ...seriesEntries].slice(0, MAX_TOTAL);

      const MAX_DETAILED = 5; // limit detailed fetches to speed up
      const detailed = combinedEntries.slice(0, MAX_DETAILED);
      const basic = combinedEntries.slice(MAX_DETAILED);

      const detailedPromises = detailed.map(async (entry) => {
        if (entry.kind === "movie") {
          const movie = entry.raw;
          try {
            const year = new Date(movie.release_date).getFullYear().toString();
            // Only fetch movie details (no OMDb) to keep search snappy
            const movieDetails = await getMovieDetails(movie.id, { timeout: 4000 }).catch(() => null);
            const rating = typeof movieDetails?.vote_average === "number" ? String(movieDetails.vote_average.toFixed(1)) : (typeof movie.vote_average === 'number' ? String(movie.vote_average.toFixed(1)) : "N/A");
            return {
              id: movie.id,
              title: movie.title,
              year,
              poster: `https://image.tmdb.org/t/p/w500${movie.poster_path}`,
              imdbRating: rating,
              type: "movie",
              runtime: movieDetails?.runtime || movie.runtime || 120,
            };
          } catch {
            return toUnifiedItem({ kind: "movie", raw: movie });
          }
        } else {
          const series = entry.raw;
          try {
            const year = new Date(series.first_air_date).getFullYear().toString();
            // Use minimal TV details (no per-season fetches) for search
            const seriesDetails = await getTVDetails(series.id, { minimal: true, timeout: 3000 }).catch(() => null);
            const rating = typeof seriesDetails?.vote_average === "number" ? String(seriesDetails.vote_average.toFixed(1)) : (typeof series.vote_average === 'number' ? String(series.vote_average.toFixed(1)) : "N/A");
            return {
              id: series.id,
              title: series.name,
              year,
              poster: `https://image.tmdb.org/t/p/w500${series.poster_path}`,
              imdbRating: rating,
              type: "tv",
              seasons: seriesDetails?.number_of_seasons || series.number_of_seasons || 1,
              episodes: seriesDetails?.number_of_episodes || series.number_of_episodes || 10,
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
    activeTab === "tv" ? r.type === "tv" : r.type === "movie"
  );
  const visibleResults = filteredByTab.slice(0, visibleCount);

  const makeKey = (it) => `${it.type}:${it.id}`;
  const isSelected = (it) => selectedKeys.includes(makeKey(it));
  const toggleSelect = (it) => {
    const key = makeKey(it);
    setSelectedKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };
  const selectVisible = () => {
    const keys = visibleResults.map(makeKey);
    setSelectedKeys(keys);
  };
  const clearSelection = () => setSelectedKeys([]);

  // Verify IMDb ratings for visible results using OMDb (same logic as cards)
  useEffect(() => {
    if (!showResults || isLoading || offlineRef.current) return;
    const items = visibleResults;
    if (!items || items.length === 0) return;

    let cancelled = false;
    const run = async () => {
      const tasks = items.map(async (it) => {
        const key = makeKey(it);
        if (imdbVerifyCache.has(key)) {
          const cached = imdbVerifyCache.get(key);
          if (!cancelled) setVerifiedRatings((p) => (p[key] === cached ? p : { ...p, [key]: cached }));
          return;
        }
        try {
          let details = null;
          if (it.type === 'movie') {
            details = await getMovieDetails(it.id, { timeout: 5000 }).catch(() => null);
          } else {
            details = await getTVDetails(it.id, { minimal: true, timeout: 5000 }).catch(() => null);
          }
          const imdbId = details?.external_ids?.imdb_id || null;
          const title = it.type === 'movie' ? (details?.title || it.title) : (details?.name || it.title);
          const year = it.type === 'movie'
            ? (details?.release_date ? String(new Date(details.release_date).getFullYear()) : it.year)
            : (details?.first_air_date ? String(new Date(details.first_air_date).getFullYear()) : it.year);

          let rating = await getIMDbRating({ imdbId, title, year }).catch(() => 'N/A');
          if (!rating || rating === 'N/A') {
            const tmdbRating = typeof details?.vote_average === 'number' ? String(details.vote_average.toFixed(1)) : undefined;
            rating = tmdbRating || it.imdbRating || 'N/A';
          }

          if (!cancelled && rating && typeof rating === 'string') {
            imdbVerifyCache.set(key, rating);
            setVerifiedRatings((prev) => ({ ...prev, [key]: rating }));
          }
        } catch {}
      });
      await Promise.allSettled(tasks);
    };

    run();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showResults, isLoading, activeTab, visibleCount, results]);

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
                <div className="ml-auto flex items-center gap-2 flex-wrap">
                  {!bulkMode && (
                    <>
                      <button onClick={() => { setActiveTab("tv"); setVisibleCount(10); }} className={`px-3 py-1 text-sm rounded-full border ${activeTab==='tv' ? 'bg-primary text-primary-foreground' : 'bg-transparent text-foreground/80'}`}>TV ({results.filter(r=>r.type==='tv').length})</button>
                      <button onClick={() => { setActiveTab("movie"); setVisibleCount(10); }} className={`px-3 py-1 text-sm rounded-full border ${activeTab==='movie' ? 'bg-primary text-primary-foreground' : 'bg-transparent text-foreground/80'}`}>Movies ({results.filter(r=>r.type==='movie').length})</button>
                      <button onClick={() => { setBulkMode(true); clearSelection(); }} className="px-3 py-1 text-sm rounded-full border bg-card/60 hover:bg-card">Bulk add</button>
                    </>
                  )}
                  {bulkMode && (
                    <>
                      <button className="px-3 py-1 text-sm rounded-full border bg-primary text-primary-foreground">Bulk add</button>
                      <button onClick={() => { setActiveTab("tv"); setVisibleCount(10); }} className={`px-3 py-1 text-sm rounded-full border ${activeTab==='tv' ? 'bg-primary text-primary-foreground' : 'bg-transparent text-foreground/80'}`}>TV</button>
                      <button onClick={() => { setActiveTab("movie"); setVisibleCount(10); }} className={`px-3 py-1 text-sm rounded-full border ${activeTab==='movie' ? 'bg-primary text-primary-foreground' : 'bg-transparent text-foreground/80'}`}>Movies</button>
                      <button onClick={selectVisible} className="px-3 py-1 text-sm rounded-full border bg-card/60 hover:bg-card">Select visible</button>
                      <button onClick={clearSelection} className="px-3 py-1 text-sm rounded-full border bg-card/60 hover:bg-card">Clear</button>
                      <button
                        onClick={() => {
                          const items = results.filter((r) => selectedKeys.includes(makeKey(r)));
                          if (items.length > 0) {
                            items.forEach((item) => {
                              onAddBookmark(item);
                              incrementSelectionBoost(makeKey(item));
                            });
                            setResults((prev) => prev.filter((r) => !items.some((v) => makeKey(v) === makeKey(r))));

                            const movies = items.filter((it) => it.type === 'movie');
                            if (movies.length > 0 && typeof onBulkFranchise === 'function') {
                              onBulkFranchise(movies);
                            }
                          }
                          setBulkMode(false);
                          clearSelection();
                        }}
                        className="px-3 py-1 text-sm rounded-full border bg-card/60 hover:bg-card"
                      >
                        Done
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="divide-y divide-border/30">
                {visibleResults.map((item) => (
                  <div
                    key={`${item.type}-${item.id}`}
                    onClick={() => {
                      if (bulkMode) {
                        toggleSelect(item);
                      } else {
                        handleAddBookmark(item);
                      }
                    }}
                    className={`flex items-center p-4 cursor-pointer transition-colors group ${bulkMode && isSelected(item) ? 'bg-primary/15' : 'hover:bg-accent/20'}`}
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
                        {(verifiedRatings[makeKey(item)] || item.imdbRating) !== "N/A" && (
                          <span className="text-primary">★ {verifiedRatings[makeKey(item)] || item.imdbRating}</span>
                        )}
                      </div>
                    </div>
                    {bulkMode && (
                      <div className="ml-3 flex items-center">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded-sm border bg-background accent-primary"
                          checked={isSelected(item)}
                          onChange={(e) => { e.stopPropagation(); toggleSelect(item); }}
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Select ${item.title}`}
                        />
                      </div>
                    )}
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
