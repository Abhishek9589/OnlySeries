import { useState, useEffect, useCallback, memo, useRef } from "react";
import { Loader2, Check } from "lucide-react";
import { useOffline } from "../hooks/use-offline";
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
  const [visibleCount, setVisibleCount] = useState(8);
  const [verifiedRatings, setVerifiedRatings] = useState({});
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [activeTab, setActiveTab] = useState("all"); // all | tv | movie
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState([]);

  const isOffline = useOffline();
  const [isFocused, setIsFocused] = useState(false);

  // Refs to avoid stale closures in async handlers
  const bookmarksRef = useRef(bookmarks);
  const offlineRef = useRef(isOffline);
  const requestSeqRef = useRef(0);
  const listRef = useRef(null);

  useEffect(() => { bookmarksRef.current = bookmarks; }, [bookmarks]);
  useEffect(() => { offlineRef.current = isOffline; }, [isOffline]);

  // Close on outside click
  useEffect(() => {
    const onDocDown = (e) => {
      if (!listRef.current) return;
      if (e.target.closest && (e.target.closest("#tiii-like-input") || e.target.closest("[data-search-dropdown]") )) return;
      setShowResults(false);
      setHighlightedIndex(-1);
      setBulkMode(false);
      setSelectedKeys([]);
    };
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, []);

  // Global signal from parent to close dropdowns/cleanup (e.g., after uploads)
  useEffect(() => {
    const handler = () => { setShowResults(false); setHighlightedIndex(-1); setBulkMode(false); setSelectedKeys([]); };
    window.addEventListener('close-search-results', handler);
    return () => window.removeEventListener('close-search-results', handler);
  }, []);

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

  const safeYear = (dateStr) => {
    try {
      if (!dateStr) return "";
      const d = new Date(dateStr);
      const y = d && Number.isFinite(d.getFullYear()) ? String(d.getFullYear()) : "";
      return y;
    } catch (e) {
      return "";
    }
  };

  const toUnifiedItem = (entry) => {
    if (entry.kind === "movie") {
      const movie = entry.raw;
      return {
        id: movie.id,
        title: movie.title,
        year: safeYear(movie.release_date) || "",
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
      year: safeYear(series.first_air_date) || "",
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
      const prepared = cached.map((item) => {
        const isAlreadyAdded = bookmarksRef.current.some(
          (bookmark) => Number(bookmark.id) === Number(item.id) && bookmark.type === item.type
        );
        return { ...item, alreadyAdded: !!isAlreadyAdded };
      });
      setResults(prepared);
      setShowResults(true);
      setIsLoading(true);
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

      const MAX_DETAILED = 5;
      const detailed = combinedEntries.slice(0, MAX_DETAILED);
      const basic = combinedEntries.slice(MAX_DETAILED);

      const detailedPromises = detailed.map(async (entry) => {
        if (entry.kind === "movie") {
          const movie = entry.raw;
          try {
            const year = safeYear(movie.release_date) || "";
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
            const year = safeYear(series.first_air_date) || "";
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
        .map((item) => {
          const isAlreadyAdded = bookmarksRef.current.some((bookmark) =>
            Number(bookmark.id) === Number(item.id) && bookmark.type === item.type
          );
          const key = `${item.type}:${item.id}`;
          return {
            ...item,
            alreadyAdded: !!isAlreadyAdded,
            similarity: calculateSimilarity(item.title, normalizedQuery, key),
            ratingScore: item.imdbRating !== "N/A" ? parseFloat(item.imdbRating) || 0 : 0,
          };
        })
        .filter((item) => {
          try {
            const sr = String(item.imdbRating || '').trim();
            const zeroLike = /^0+(?:\.0+)?$/.test(sr);
            if (zeroLike) return false;
            return item.similarity > 0 || norm(item.title || '') === norm(normalizedQuery);
          } catch (e) {
            return item.similarity > 0;
          }
        })
        .sort((a, b) => {
          try {
            const nq = norm(normalizedQuery);
            const aTitle = norm(a.title || '');
            const bTitle = norm(b.title || '');
            const aExact = aTitle === nq;
            const bExact = bTitle === nq;
            if (aExact && !bExact) return -1;
            if (!aExact && bExact) return 1;
          } catch (e) {}

          if (a.similarity !== b.similarity) return b.similarity - a.similarity;
          if (a.ratingScore !== b.ratingScore) return b.ratingScore - a.ratingScore;
          return a.title.localeCompare(b.title);
        });

      if (requestId === requestSeqRef.current) {
        setResults(successfulResults);
        setCachedSearch(normalizedQuery, successfulResults);
        setActiveTab('all');
      }
    } catch (error) {
      setResults([]);
      if (requestId === requestSeqRef.current) {
        setHasError(true);
      }
    } finally {
      if (requestId === requestSeqRef.current) {
        setIsLoading(false);
      }
    }
  };

  // Debounced search
  useEffect(() => {
    const normalized = (searchTerm || "").trim();
    if (normalized.length < 2) {
      setResults([]);
      setShowResults(false);
      setHasError(false);
      setIsLoading(false);
      setVisibleCount(8);
      setHighlightedIndex(-1);
      setActiveTab('all');
      setBulkMode(false);
      setSelectedKeys([]);
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
    }, 350);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Verify IMDb ratings (only for visible items)
  useEffect(() => {
    if (!showResults || isLoading || offlineRef.current) return;
    const items = (activeTab === 'all' ? results : results.filter((r) => activeTab === 'tv' ? r.type === 'tv' : r.type === 'movie')).slice(0, visibleCount);
    if (!items || items.length === 0) return;

    let cancelled = false;
    const run = async () => {
      const tasks = items.map(async (it) => {
        const key = `${it.type}:${it.id}`;
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
            ? (details?.release_date ? (safeYear(details.release_date) || it.year) : it.year)
            : (details?.first_air_date ? (safeYear(details.first_air_date) || it.year) : it.year);

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
  }, [showResults, isLoading, visibleCount, results, activeTab]);

  // Log misses once per query when no results are shown
  const onNoResultsLogMiss = useCallback(() => {
    try {
      const raw = localStorage.getItem(LS_MISSES);
      const arr = raw ? JSON.parse(raw) : [];
      arr.push({ q: (searchTerm || "").trim(), ts: Date.now() });
      localStorage.setItem(LS_MISSES, JSON.stringify(arr.slice(-200)));
    } catch {}
  }, [searchTerm]);

  const lastMissRef = useRef('');
  useEffect(() => {
    const q = (searchTerm || '').trim();
    if (!showResults || isLoading) return;
    if (q.length >= 2 && results.length === 0 && lastMissRef.current !== q) {
      onNoResultsLogMiss();
      lastMissRef.current = q;
    }
  }, [showResults, isLoading, searchTerm, results.length, onNoResultsLogMiss]);

  const clearSearch = () => {
    setSearchTerm("");
    setResults([]);
    setShowResults(false);
    setHighlightedIndex(-1);
    setBulkMode(false);
    setSelectedKeys([]);
    setActiveTab('all');
  };

  const handleAddBookmark = (item) => {
    onAddBookmark(item);
    const key = `${item.type}:${item.id}`;
    incrementSelectionBoost(key);
    clearSearch();
  };

  const makeKey = (it) => `${it.type}:${it.id}`;
  const isSelected = (it) => selectedKeys.includes(makeKey(it));
  const toggleSelect = (it) => {
    const key = makeKey(it);
    setSelectedKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };
  const selectVisible = () => {
    const filtered = activeTab === 'all' ? results : results.filter((r) => activeTab === 'tv' ? r.type === 'tv' : r.type === 'movie');
    const keys = filtered.slice(0, visibleCount).map(makeKey);
    setSelectedKeys(keys);
  };
  const clearSelection = () => setSelectedKeys([]);

  const tvCount = results.filter((r) => r.type === 'tv').length;
  const movieCount = results.filter((r) => r.type === 'movie').length;
  const filteredByTab = activeTab === 'all' ? results : results.filter((r) => activeTab === 'tv' ? r.type === 'tv' : r.type === 'movie');
  const visibleResults = filteredByTab.slice(0, visibleCount);

  // Highlight matched query in title
  const renderHighlighted = (text, q) => {
    const src = String(text || '');
    const query = String(q || '').trim();
    if (!query) return src;
    try {
      const re = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "ig");
      const parts = [];
      let lastIndex = 0;
      let m;
      while ((m = re.exec(src)) !== null) {
        if (m.index > lastIndex) parts.push(src.slice(lastIndex, m.index));
        parts.push(<span key={m.index} className="text-primary">{m[0]}</span>);
        lastIndex = m.index + m[0].length;
      }
      if (lastIndex < src.length) parts.push(src.slice(lastIndex));
      return parts;
    } catch {
      return src;
    }
  };

  const onKeyDown = (e) => {
    if (!showResults) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = Math.min((highlightedIndex < 0 ? -1 : highlightedIndex) + 1, visibleResults.length - 1);
      setHighlightedIndex(next);
      requestAnimationFrame(() => {
        const el = listRef.current?.querySelector(`[data-index="${next}"]`);
        el?.scrollIntoView({ block: 'nearest' });
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const next = Math.max((highlightedIndex < 0 ? 0 : highlightedIndex) - 1, 0);
      setHighlightedIndex(next);
      requestAnimationFrame(() => {
        const el = listRef.current?.querySelector(`[data-index="${next}"]`);
        el?.scrollIntoView({ block: 'nearest' });
      });
    } else if (e.key === 'Enter') {
      if (highlightedIndex >= 0 && highlightedIndex < visibleResults.length) {
        const it = visibleResults[highlightedIndex];
        if (bulkMode) {
          if (!it.alreadyAdded) toggleSelect(it);
        } else if (!it.alreadyAdded) {
          handleAddBookmark(it);
        }
      }
    } else if (e.key === 'Escape') {
      setShowResults(false);
      setHighlightedIndex(-1);
      setBulkMode(false);
      setSelectedKeys([]);
    } else if (e.key === 'Home') {
      setHighlightedIndex(0);
    } else if (e.key === 'End') {
      setHighlightedIndex(Math.max(0, visibleResults.length - 1));
    }
  };

  if (!isVisible) return null;

  return (
    <div className="w-[98%] max-w-[800px] mx-auto relative">
      <div className="w-full flex justify-center">
        <input
          id="tiii-like-input"
          type="text"
          aria-label="Find your next watch"
          placeholder="Find your next watch..."
          value={searchTerm}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={onKeyDown}
          onChange={(e) => { setSearchTerm(e.target.value); setVisibleCount(8); setHighlightedIndex(-1); }}
          className={`${isFocused ? 'text-foreground placeholder:text-foreground/30' : 'text-primary placeholder:text-primary/70'} caret-primary bg-transparent border-0 outline-none shadow-none block h-[2em] w-[530px] max-w-full mx-auto px-2 font-extralight transition-colors duration-200 text-[2.5rem] sm:text-[3rem] md:text-[3.5rem]`}
          role="combobox"
          aria-expanded={showResults}
          aria-controls="search-suggestions"
        />
      </div>

      {showResults && (
        <div
          data-search-dropdown
          ref={listRef}
          id="search-suggestions"
          className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[95%] max-w-[720px] bg-card/95 backdrop-blur-md border border-border/50 rounded-2xl overflow-hidden z-50 shadow-2xl max-h-[28rem] overflow-y-auto custom-scrollbar"
          role="listbox"
        >
          {/* Header pills */}
          <div className="sticky top-0 z-10 flex items-center gap-1 p-2 bg-card/95 backdrop-blur-md border-b border-border/30 text-xs">
            {!bulkMode && (
              <>
                <button onClick={() => { setActiveTab((prev) => prev === 'tv' ? 'all' : 'tv'); setVisibleCount(8); }} className={`px-3 py-1 rounded-full border ${activeTab==='tv' ? 'bg-primary text-primary-foreground' : 'bg-transparent text-foreground/80'}`}>TV ({tvCount})</button>
                <button onClick={() => { setActiveTab((prev) => prev === 'movie' ? 'all' : 'movie'); setVisibleCount(8); }} className={`px-3 py-1 rounded-full border ${activeTab==='movie' ? 'bg-primary text-primary-foreground' : 'bg-transparent text-foreground/80'}`}>Movies ({movieCount})</button>
                <button onClick={() => { setBulkMode(true); setSelectedKeys([]); }} className="ml-auto px-3 py-1 rounded-full border bg-card/60 hover:bg-card">Bulk add</button>
              </>
            )}
            {bulkMode && (
              <>
                <button className="px-3 py-1 rounded-full border bg-primary text-primary-foreground">Bulk add</button>
                <button onClick={() => { setActiveTab((prev) => prev === 'tv' ? 'all' : 'tv'); setVisibleCount(8); }} className={`px-3 py-1 rounded-full border ${activeTab==='tv' ? 'bg-primary text-primary-foreground' : 'bg-transparent text-foreground/80'}`}>TV</button>
                <button onClick={() => { setActiveTab((prev) => prev === 'movie' ? 'all' : 'movie'); setVisibleCount(8); }} className={`px-3 py-1 rounded-full border ${activeTab==='movie' ? 'bg-primary text-primary-foreground' : 'bg-transparent text-foreground/80'}`}>Movies</button>
                <div className="ml-auto flex items-center gap-1">
                  <button onClick={selectVisible} className="px-3 py-1 rounded-full border bg-card/60 hover:bg-card">Select visible</button>
                  <button onClick={clearSelection} className="px-3 py-1 rounded-full border bg-card/60 hover:bg-card">Clear</button>
                  <button
                    onClick={() => {
                      const items = results.filter((r) => selectedKeys.includes(makeKey(r)));
                      if (items.length > 0) {
                        items.forEach((item) => {
                          onAddBookmark(item);
                          incrementSelectionBoost(makeKey(item));
                        });
                      }
                      setShowResults(false);
                      const movies = items.filter((it) => it.type === 'movie');
                      if (movies.length > 0 && typeof onBulkFranchise === 'function') {
                        onBulkFranchise(movies);
                      }
                      setBulkMode(false);
                      setSelectedKeys([]);
                    }}
                    className="px-3 py-1 rounded-full border bg-card/60 hover:bg-card"
                  >
                    Done
                  </button>
                </div>
              </>
            )}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center p-6">
              <Loader2 className="w-5 h-5 animate-spin text-primary mr-2" />
              <span className="text-muted-foreground">Searching...</span>
            </div>
          ) : hasError && offlineRef.current ? (
            <div className="p-6 text-center text-muted-foreground">
              <p className="font-medium">You're offline</p>
              <p className="text-sm mt-1">Search requires an internet connection</p>
            </div>
          ) : results.length > 0 ? (
            <div>
              {visibleResults.map((item, idx) => (
                <div
                  key={`${item.type}-${item.id}`}
                  data-index={idx}
                  role="option"
                  aria-selected={highlightedIndex === idx}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    if (bulkMode) {
                      toggleSelect(item);
                    } else {
                      if (!item.alreadyAdded) handleAddBookmark(item);
                    }
                  }}
                  className={`px-4 py-2.5 select-none transition-colors ${bulkMode ? 'cursor-pointer' : (item.alreadyAdded ? 'opacity-60 cursor-default' : 'cursor-pointer')} ${bulkMode && isSelected(item) ? 'bg-primary/20' : (highlightedIndex === idx ? 'bg-accent/20' : 'hover:bg-accent/10')}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="truncate text-[0.98rem] font-medium">
                      {renderHighlighted(item.title, searchTerm)}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground whitespace-nowrap text-sm">
                      <span className="capitalize">{item.type === 'tv' ? 'TV' : 'Movie'}</span>
                      <span>•</span>
                      <span>★ {(verifiedRatings[makeKey(item)] || item.imdbRating) || 'N/A'}</span>
                      {item.year ? (<><span>•</span><span>{item.year}</span></>) : null}
                      {!bulkMode && item.alreadyAdded && (
                        <span className="ml-2 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-card/60 border border-border/70 text-xs">
                          <Check className="w-3.5 h-3.5" /> Added
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {filteredByTab.length > visibleCount && (
                <div className="p-3 text-center border-t border-border/30 bg-card/95">
                  <button onClick={() => setVisibleCount((c) => c + 8)} className="text-sm text-primary hover:underline">
                    Show more
                  </button>
                </div>
              )}
            </div>
          ) : searchTerm.length >= 2 ? (
            <div className="p-6 text-center text-muted-foreground">
              <p>No results found for "{searchTerm}"</p>
              <p className="text-sm mt-1">Try different keywords or check spelling</p>
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
