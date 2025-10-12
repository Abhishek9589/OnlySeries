import { X, Clock, Star, Tv, Eye, EyeOff, Play, Search } from "lucide-react";
import FallbackImage from "./FallbackImage";
import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getMovieDetails, getTVDetails, getIMDbRating } from "../lib/api";

const PAGE_SIZE = 36;

// Cache verified IMDb ratings to avoid repeat OMDb calls per item
const imdbRatingCache = new Map();

function BookmarkCard({
  item,
  selectionMode,
  isSelected,
  onToggleSelect,
  onToggleWatchStatus,
  onRemoveBookmark,
  onCardClick,
  onUpdatePatch,
  hoveredCard,
  setHoveredCard,
  formatWatchTime,
}) {
  const [loading, setLoading] = useState(false);
  const [omdbLoading, setOmdbLoading] = useState(false);
  const [verifiedRating, setVerifiedRating] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    setVerifiedRating(null);
    const needsMovieEnrich = item.type === 'movie' && (!Number.isFinite(item.runtime) || !item.imdbRating || item.imdbRating === 'N/A');
    const needsTVEnrich = item.type === 'tv' && (!Number.isFinite(item.episodes) || !Number.isFinite(item.averageEpisodeRuntime) || !item.imdbRating || item.imdbRating === 'N/A');

    if (!needsMovieEnrich && !needsTVEnrich) return;

    let cancelled = false;

    const doEnrich = async () => {
      setLoading(true);
      try {
        if (item.type === 'movie') {
          const details = await getMovieDetails(item.id).catch(() => null);
          const runtime = Number.isFinite(details?.runtime) ? details.runtime : (Number.isFinite(item.runtime) ? item.runtime : undefined);
          const imdbId = details?.external_ids?.imdb_id;
          const year = details?.release_date ? String(new Date(details.release_date).getFullYear()) : item.year;
          const omdbRating = await getIMDbRating({ imdbId, title: details?.title || item.title, year }).catch(() => 'N/A');
          const imdbRating = (omdbRating && omdbRating !== 'N/A') ? omdbRating : (typeof details?.vote_average === 'number' ? String(details.vote_average.toFixed(1)) : (item.imdbRating || 'N/A'));
          if (!cancelled && mountedRef.current) {
            onUpdatePatch({ runtime, imdbRating });
          }
        } else if (item.type === 'tv') {
          const details = await getTVDetails(item.id, { minimal: true }).catch(() => null);
          let patch = {};
          if (details) {
            if (Number.isFinite(details.number_of_seasons)) patch.seasons = details.number_of_seasons;
            if (Number.isFinite(details.number_of_episodes)) patch.episodes = details.number_of_episodes;
            if (Array.isArray(details.episode_run_time) && details.episode_run_time.length > 0) patch.averageEpisodeRuntime = Math.round(details.episode_run_time.filter(Number.isFinite).reduce((a,c)=>a+c,0)/details.episode_run_time.filter(Number.isFinite).length);
          }

          const fullDetails = await getTVDetails(item.id).catch(() => null);
          if (fullDetails) {
            if (!patch.seasons && Number.isFinite(fullDetails.number_of_seasons)) patch.seasons = fullDetails.number_of_seasons;
            if (!patch.episodes && Number.isFinite(fullDetails.number_of_episodes)) patch.episodes = fullDetails.number_of_episodes;
            if (!patch.averageEpisodeRuntime && Array.isArray(fullDetails.episode_run_time) && fullDetails.episode_run_time.length>0) patch.averageEpisodeRuntime = Math.round(fullDetails.episode_run_time.filter(Number.isFinite).reduce((a,c)=>a+c,0)/fullDetails.episode_run_time.filter(Number.isFinite).length);
            patch.episode_run_time = Array.isArray(fullDetails.episode_run_time) ? fullDetails.episode_run_time : (item.episode_run_time || []);
            patch.genres = Array.isArray(fullDetails.genres) ? fullDetails.genres : item.genres;
          }

          const imdbId = fullDetails?.external_ids?.imdb_id || details?.external_ids?.imdb_id;
          const year = fullDetails?.first_air_date ? String(new Date(fullDetails.first_air_date).getFullYear()) : item.year;
          const omdbRating = await getIMDbRating({ imdbId, title: fullDetails?.name || item.title, year }).catch(() => 'N/A');
          const imdbRating = (omdbRating && omdbRating !== 'N/A') ? omdbRating : (typeof fullDetails?.vote_average === 'number' ? String(fullDetails.vote_average.toFixed(1)) : (item.imdbRating || 'N/A'));
          patch.imdbRating = imdbRating;

          if (!cancelled && mountedRef.current) {
            onUpdatePatch(patch);
          }
        }
      } catch (err) {
      } finally {
        if (!cancelled && mountedRef.current) setLoading(false);
      }
    };

    doEnrich();

    return () => {
      cancelled = true;
      mountedRef.current = false;
    };
  }, [item.id, item.runtime, item.imdbRating, item.episodes, item.averageEpisodeRuntime]);

  const ensureVerifiedImdbRating = async () => {
    const cacheKey = `${item.type}-${item.id}`;
    if (imdbRatingCache.has(cacheKey)) {
      const cached = imdbRatingCache.get(cacheKey);
      if (mountedRef.current) setVerifiedRating(cached);
      return;
    }
    if (omdbLoading) return;
    setOmdbLoading(true);
    try {
      let imdbId = null;
      let title = item.title;
      let year = item.year;
      try {
        if (item.type === 'movie') {
          const details = await getMovieDetails(item.id, { timeout: 5000 }).catch(() => null);
          imdbId = details?.external_ids?.imdb_id || null;
          title = details?.title || title;
          year = details?.release_date ? String(new Date(details.release_date).getFullYear()) : year;
        } else if (item.type === 'tv') {
          const details = await getTVDetails(item.id, { minimal: true, timeout: 4000 }).catch(() => null);
          imdbId = details?.external_ids?.imdb_id || null;
          title = details?.name || title;
          year = details?.first_air_date ? String(new Date(details.first_air_date).getFullYear()) : year;
        }
      } catch {}

      let rating = await getIMDbRating({ imdbId, title, year }).catch(() => 'N/A');
      if (!rating || rating === 'N/A') {
        rating = await getIMDbRating({ title, year }).catch(() => 'N/A');
      }
      if (rating && typeof rating === 'string') {
        imdbRatingCache.set(cacheKey, rating);
        if (mountedRef.current) setVerifiedRating(rating);
      }
    } finally {
      if (mountedRef.current) setOmdbLoading(false);
    }
  };

  const handleRemoveClick = (e, id, type) => {
    e.stopPropagation();
    onRemoveBookmark(id, type);
  };

  if (loading) {
    return (
      <div className="relative w-full animate-pulse">
        <div className="aspect-[2/3] rounded-none bg-card/60" />
        <div className="mt-3 h-4 bg-card/50 rounded w-3/4 mx-auto" />
        <div className="mt-2 h-3 bg-card/40 rounded w-1/2 mx-auto" />
      </div>
    );
  }

  return (
    <div
      className={`relative group w-full cursor-default`}
      onMouseEnter={() => { setHoveredCard(`${item.type}-${item.id}`); ensureVerifiedImdbRating(); }}
      onMouseLeave={() => setHoveredCard(null)}
      onClick={() => {
        if (selectionMode) {
          // In selection mode only movies are selectable
          if (item.type === 'movie') {
            onToggleSelect && onToggleSelect(item);
          }
          return;
        }
        onCardClick && onCardClick(item);
      }}
      onKeyDown={(e) => {
        if (selectionMode) {
          if (item.type === 'movie' && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onToggleSelect && onToggleSelect(item);
          }
          return;
        }
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onCardClick && onCardClick(item);
        }
      }}
      role={selectionMode && item.type === 'movie' ? 'button' : undefined}
      tabIndex={(!selectionMode || (selectionMode && item.type === 'movie')) ? 0 : -1}
      aria-pressed={selectionMode && item.type === 'movie' ? isSelected(item) : undefined}
    >
      <div className={`relative aspect-[2/3] rounded-none overflow-hidden bg-card/80 backdrop-blur-sm ${isSelected(item) ? 'ring-2 ring-ring' : ''} transition-all duration-300`}>
        <FallbackImage
          src={item.poster}
          alt={item.title}
          type={item.type}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        />

        {selectionMode && item.type === 'movie' && (
          <label className="absolute top-3 left-3 z-10 flex items-center">
            <input
              type="checkbox"
              aria-label={`Select ${item.title}`}
              checked={isSelected(item)}
              onChange={(e) => {
                e.stopPropagation();
                onToggleSelect && onToggleSelect(item);
              }}
              onClick={(e) => e.stopPropagation()}
              className={`w-5 h-5 rounded-sm border bg-background focus:outline-none focus:ring-2 focus:ring-ring accent-primary ${isSelected(item) ? 'border-primary' : 'border-border'}`}
            />
          </label>
        )}

        <AnimatePresence>
        {hoveredCard === `${item.type}-${item.id}` && !selectionMode && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="absolute inset-0 bg-black/80 flex flex-col justify-between p-4 backdrop-blur-sm">
            <div className="flex justify-between items-start">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleWatchStatus(item.id, item.type);
                }}
                className={`p-2 rounded-lg transition-all ${
                  item.watchStatus === 'watched'
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30'
                    : 'bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30'
                }`}
                title={item.watchStatus === 'watched' ? 'Watched' : 'Will Watch'}
              >
                {item.watchStatus === 'watched' ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={(e) => handleRemoveClick(e, item.id, item.type)}
                className="bg-destructive/90 backdrop-blur-sm text-white rounded-full p-2 hover:bg-destructive transition-colors shadow-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-center">
              <div className="text-white text-lg font-semibold" title={item.title} style={{display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'normal'}}>{item.title}</div>
            </div>

            <div className="text-white space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span className="inline-flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded bg-yellow-400/20 text-yellow-300 text-[10px] font-semibold">IMDb</span>
                  {verifiedRating || item.imdbRating}
                  {omdbLoading ? <span className="ml-1 w-3 h-3 border-2 border-yellow-300/70 border-t-transparent rounded-full animate-spin inline-block"></span> : null}
                </span>
              </div>

              {item.type === 'tv' ? (
                <>
                  <div className="flex items-center gap-2 text-sm">
                    <Tv className="w-4 h-4" />
                    <span>
                      {item.seasons || 1} Season
                      {(item.seasons || 1) !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Play className="w-4 h-4" />
                    <span>{item.episodes || 10} Episodes</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4" />
                    <span>{formatWatchTime(item)}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4" />
                    <span>{formatWatchTime(item)}</span>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function PaginationControlsBar({
  currentPage,
  totalPages,
  pageInput,
  setPageInput,
  setCurrentPage,
  localSearch,
  setLocalSearch,
  searchQ,
  searchResults,
  onCardClick,
}) {
  const [expanded, setExpanded] = useState(false);
  const inputRef = useRef(null);
  useEffect(() => { if (expanded) { inputRef.current?.focus(); } }, [expanded]);
  return (
    <div className="w-full first:hidden">
      <div className="flex items-center gap-2 justify-between">
        <div />
        <div className="flex-1 flex items-center justify-center gap-2 sm:gap-3 text-xs sm:text-sm text-muted-foreground">
          <button
            onClick={() => { setCurrentPage((p) => Math.max(1, p - 1)); try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch {} }}
            disabled={currentPage <= 1}
            className="px-2 sm:px-3 py-1 rounded-md bg-card border border-border text-foreground hover:bg-card/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Previous page"
          >
            Previous
          </button>
          <span>Page</span>
          <input
            value={pageInput}
            onChange={(e) => {
              const val = e.target.value.replace(/[^0-9]/g, "");
              setPageInput(val);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const n = parseInt(pageInput || "1", 10);
                if (!isNaN(n)) {
                  const clamped = Math.min(Math.max(n, 1), totalPages);
                  setCurrentPage(clamped);
                } else {
                  setCurrentPage(1);
                }
                try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch {}
              }
            }}
            onBlur={() => {
              const n = parseInt(pageInput || "1", 10);
              if (!isNaN(n)) {
                const clamped = Math.min(Math.max(n, 1), totalPages);
                setCurrentPage(clamped);
              } else {
                setCurrentPage(1);
              }
              try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch {}
            }}
            inputMode="numeric"
            pattern="[0-9]*"
            className="w-12 sm:w-16 text-center px-2 py-1 rounded-md bg-card border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Page number"
          />
          <span>of {totalPages}</span>
          <button
            onClick={() => { setCurrentPage((p) => Math.min(totalPages, p + 1)); try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch {} }}
            disabled={currentPage >= totalPages}
            className="px-2 sm:px-3 py-1 rounded-md bg-card border border-border text-foreground hover:bg-card/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Next page"
          >
            Next
          </button>
        </div>
        <div className="hidden md:flex justify-end items-center gap-2">
                    <div className={`relative transition-all duration-200 w-0`}>
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 opacity-0`} />
            <input
              ref={inputRef}
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Search your list..."
              tabIndex={-1}
              className={`w-full p-0 border-0 bg-card/80 backdrop-blur-sm rounded-2xl focus:outline-none transition-all shadow-lg text-foreground`}
            />
            {false && localSearch && (
              <button
                onClick={() => setLocalSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:text-foreground"
                aria-label="Clear"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {false && searchQ && (
              <div className="absolute z-50 left-0 right-0 mt-2 max-h-72 overflow-y-auto custom-scrollbar bg-card/95 backdrop-blur-md border border-border/50 rounded-xl shadow-2xl">
                {searchResults.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">No matches</div>
                ) : (
                  <ul className="divide-y divide-border/50">
                    {searchResults.slice(0, 20).map((res) => {
                      if (res.kind === "franchise") {
                        const cover = res.movies[0];
                        return (
                          <li
                            key={res.franchiseKey}
                            className="flex items-center gap-3 px-3 py-2 hover:bg-secondary/40 cursor-pointer"
                            onClick={() => onCardClick && onCardClick({ ...cover, franchise: res.franchise })}
                          >
                            <img src={cover.poster} alt={res.franchise} className="w-8 h-12 object-cover rounded-md" />
                            <div className="flex-1">
                              <div className="text-sm text-foreground font-medium">{res.franchise}</div>
                              <div className="text-xs text-muted-foreground">Franchise</div>
                            </div>
                          </li>
                        );
                      }
                      const it = res.item;
                      return (
                        <li
                          key={`${it.type}-${it.id}`}
                          className={`flex items-center gap-3 px-3 py-2 hover:bg-secondary/40 ${it.type === 'tv' || it.type === 'movie' ? '' : 'cursor-pointer'}`}
                        >
                          <img src={it.poster} alt={it.title} className="w-8 h-12 object-cover rounded-md" />
                          <div className="flex-1">
                            <div className="text-sm text-foreground font-medium" style={{display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'normal'}}>{it.title}</div>
                            <div className="text-xs text-muted-foreground capitalize">{it.type}</div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BookmarksGrid({
  bookmarks,
  sortType = "time_desc",
  onRemoveBookmark,
  onCardClick,
  onToggleWatchStatus,
  onUpdateBookmark,
  selectionMode = false,
  selectedKeys = [],
  onToggleSelect,
}) {
  const gridRef = useRef(null);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const [localSearch, setLocalSearch] = useState("");


  const formatWatchTime = (item) => {
    if (item.type === "movie") {
      const totalMinutes = Number.isFinite(item.runtime) ? item.runtime : 120;
      const days = Math.floor(totalMinutes / (24 * 60));
      const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
      const minutes = totalMinutes % 60;

      if (days > 0) {
        return `${days}d ${hours}h ${minutes}m`;
      } else {
        return `${hours}h ${minutes}m`;
      }
    } else {
      // TV show: if totalRuntimeMinutes already computed prefer that
      let totalMinutes = null;
      if (Number.isFinite(item.totalRuntimeMinutes)) {
        totalMinutes = item.totalRuntimeMinutes;
      } else {
        const episodeCount = Number.isFinite(item.episodes)
          ? item.episodes
          : Number.isFinite(item.number_of_episodes)
          ? item.number_of_episodes
          : (item.seasons || 1) * 10;

        // Determine per-episode runtime from multiple possible fields
        let epRuntime = undefined;
        if (Number.isFinite(item.averageEpisodeRuntime)) {
          epRuntime = item.averageEpisodeRuntime;
        } else if (Array.isArray(item.episode_run_time) && item.episode_run_time.length > 0) {
          epRuntime = Math.round(item.episode_run_time.reduce((a, c) => a + c, 0) / item.episode_run_time.length);
        } else if (Number.isFinite(item.episode_run_time)) {
          epRuntime = item.episode_run_time;
        } else {
          epRuntime = 45; // fallback
        }

        totalMinutes = episodeCount * epRuntime;
      }

      const days = Math.floor(totalMinutes / (24 * 60));
      const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
      const minutes = totalMinutes % 60;

      if (days > 0) {
        return `${days}d ${hours}h ${minutes}m`;
      } else {
        return `${hours}h ${minutes}m`;
      }
    }
  };

  // Group movies by franchise and calculate average ratings
  const groupedBookmarks = bookmarks.reduce(
    (acc, item) => {
      if (item.type === "movie" && item.franchise) {
        if (!acc.franchises[item.franchise]) {
          acc.franchises[item.franchise] = [];
        }
        acc.franchises[item.franchise].push(item);
      } else {
        acc.individual.push(item);
      }
      return acc;
    },
    {
      franchises: {},
      individual: [],
    },
  );

  // Build a flat list of cards to paginate: franchises first (as single cards), then individual items
  const franchiseCards = Object.entries(groupedBookmarks.franchises).map(
    ([franchise, movies]) => ({
      kind: "franchise",
      franchise,
      movies,
      // Stable unique key: name + sorted (type-id) list to avoid collisions
      franchiseKey: `franchise-${franchise}-${movies
        .map((m) => `${m.type}-${m.id}`)
        .sort()
        .join("|")}`,
      minAddedAt: Math.min(...movies.map((m) => m.addedAt || 0)),
      maxAddedAt: Math.max(...movies.map((m) => m.addedAt || 0)),
    })
  );
  const individualCards = groupedBookmarks.individual.map((item) => ({
    kind: "individual",
    item,
  }));

  const allCardsUnsorted = [...franchiseCards, ...individualCards];

  const allCards = [...allCardsUnsorted].sort((a, b) => {
    if (sortType === "alpha_asc") {
      const nameA = a.kind === "franchise" ? a.franchise : (a.item.title || "");
      const nameB = b.kind === "franchise" ? b.franchise : (b.item.title || "");
      return nameA.localeCompare(nameB);
    }
    if (sortType === "alpha_desc") {
      const nameA = a.kind === "franchise" ? a.franchise : (a.item.title || "");
      const nameB = b.kind === "franchise" ? b.franchise : (b.item.title || "");
      return nameB.localeCompare(nameA);
    }
    if (sortType === "time_asc") {
      const timeA = a.kind === "franchise" ? (Number.isFinite(a.minAddedAt) ? a.minAddedAt : Number.MAX_SAFE_INTEGER) : (Number.isFinite(a.item.addedAt) ? a.item.addedAt : Number.MAX_SAFE_INTEGER);
      const timeB = b.kind === "franchise" ? (Number.isFinite(b.minAddedAt) ? b.minAddedAt : Number.MAX_SAFE_INTEGER) : (Number.isFinite(b.item.addedAt) ? b.item.addedAt : Number.MAX_SAFE_INTEGER);
      return timeA - timeB;
    }
    // time_desc default
    const timeA = a.kind === "franchise" ? (Number.isFinite(a.maxAddedAt) ? a.maxAddedAt : Number.MIN_SAFE_INTEGER) : (Number.isFinite(a.item.addedAt) ? a.item.addedAt : Number.MIN_SAFE_INTEGER);
    const timeB = b.kind === "franchise" ? (Number.isFinite(b.maxAddedAt) ? b.maxAddedAt : Number.MIN_SAFE_INTEGER) : (Number.isFinite(b.item.addedAt) ? b.item.addedAt : Number.MIN_SAFE_INTEGER);
    return timeB - timeA;
  });

  const searchQ = localSearch.trim().toLowerCase();
  const searchResults = searchQ
    ? allCards.filter((c) =>
        c.kind === "franchise"
          ? (
              c.franchise.toLowerCase().includes(searchQ) ||
              c.movies.some((m) => (m.title || "").toLowerCase().includes(searchQ))
            )
          : (c.item.title || "").toLowerCase().includes(searchQ)
      )
    : [];

  const totalPages = Math.max(1, Math.ceil(allCards.length / PAGE_SIZE));

  // Clamp current page when data changes
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
      setPageInput(String(totalPages));
    } else if (currentPage < 1) {
      setCurrentPage(1);
      setPageInput("1");
    }
  }, [totalPages, currentPage]);

  // Keep input in sync when page changes externally
  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);


  const handleRemoveClick = (e, id, type) => {
    e.stopPropagation();
    onRemoveBookmark(id, type);
  };

  if (bookmarks.length === 0) {
    return null;
  }

  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const visibleCards = allCards.slice(startIndex, startIndex + PAGE_SIZE);

  const isSelected = (item) => selectedKeys.includes(`${item.type}-${item.id}`);


  return (
    <div className="space-y-6">
      <PaginationControlsBar
        currentPage={currentPage}
        totalPages={totalPages}
        pageInput={pageInput}
        setPageInput={setPageInput}
        setCurrentPage={setCurrentPage}
        localSearch={localSearch}
        setLocalSearch={setLocalSearch}
        searchQ={searchQ}
        searchResults={searchResults}
        onCardClick={onCardClick}
      />

      <div
        ref={gridRef}
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-6 gap-0 justify-items-stretch items-stretch"
      >
        <AnimatePresence>
        {visibleCards.map((card) => {
          if (card.kind === "franchise") {
            const { franchise, movies } = card;
            return (
              <motion.div
                key={card.franchiseKey}
                className="relative group cursor-pointer w-full"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                whileHover={{ y: -2 }}
                onMouseEnter={() => setHoveredCard(card.franchiseKey)}
                onMouseLeave={() => setHoveredCard(null)}
                onClick={() => { if (movies[0].type === 'tv') return; onCardClick && onCardClick({ ...movies[0], franchise }); }}
              >
                <div className="relative aspect-[2/3] rounded-none overflow-hidden bg-gradient-to-br from-card via-card/90 to-card/80 transition-all duration-300">
                  <FallbackImage
                    src={movies[0].poster}
                    alt={franchise}
                    type={movies[0].type}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

                  <div className="absolute top-3 right-3">
                    <div className="px-3 py-1 bg-primary/90 backdrop-blur-sm rounded-full text-xs font-medium text-primary-foreground shadow-lg">
                      Franchise
                    </div>
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <div className="text-white font-semibold text-base md:text-lg drop-shadow-lg" style={{display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'normal'}}>
                      {franchise}
                    </div>
                  </div>

                  {hoveredCard === card.franchiseKey && (
                    <div className="absolute inset-0 bg-black/80 flex flex-col justify-between p-4 backdrop-blur-sm">
                      <div className="flex justify-between items-start">
                        {(() => {
                          const allWatched = movies.every((m) => m.watchStatus === "watched");
                          const btnClasses = allWatched
                            ? "bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30"
                            : "bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30";
                          return (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (allWatched) {
                                  movies.forEach((m) => {
                                    if (m.watchStatus === "watched") onToggleWatchStatus(m.id, m.type);
                                  });
                                } else {
                                  movies.forEach((m) => {
                                    if (m.watchStatus !== "watched") onToggleWatchStatus(m.id, m.type);
                                  });
                                }
                              }}
                              className={`p-2 rounded-lg transition-all ${btnClasses}`}
                              title={allWatched ? "Watched" : "Will Watch"}
                            >
                              {allWatched ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </button>
                          );
                        })()}
                        <button
                          onClick={(e) =>
                            handleRemoveClick(e, movies[0].id, movies[0].type)
                          }
                          className="bg-destructive/90 backdrop-blur-sm text-white rounded-full p-2 hover:bg-destructive transition-colors shadow-lg"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="text-center">
                        <div className="text-white text-lg font-semibold" title={franchise} style={{display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'normal'}}>{franchise}</div>
                      </div>

                      <div className="text-white space-y-3">
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="w-4 h-4" />
                          <span>
                            {Math.floor(
                              movies.reduce(
                                (total, movie) => total + (movie.runtime || 120),
                                0,
                              ) / 60,
                            )}
                            h{" "}
                            {movies.reduce(
                              (total, movie) => total + (movie.runtime || 120),
                              0,
                            ) % 60}
                            m
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          }

          const item = card.item;
          return (
            <motion.div
              key={`${item.type}-${item.id}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              whileHover={{ y: -2 }}
            >
              <BookmarkCard
                item={item}
                selectionMode={selectionMode}
                isSelected={isSelected}
                onToggleSelect={onToggleSelect}
                onToggleWatchStatus={onToggleWatchStatus}
                onRemoveBookmark={onRemoveBookmark}
                onUpdatePatch={(patch) => {
                  if (typeof onUpdateBookmark === 'function') {
                    onUpdateBookmark(item.id, item.type, patch);
                  }
                }}
                hoveredCard={hoveredCard}
                setHoveredCard={setHoveredCard}
                formatWatchTime={formatWatchTime}
              />
            </motion.div>
          );
        })}
        </AnimatePresence>
      </div>

      <PaginationControlsBar
        currentPage={currentPage}
        totalPages={totalPages}
        pageInput={pageInput}
        setPageInput={setPageInput}
        setCurrentPage={setCurrentPage}
        localSearch={localSearch}
        setLocalSearch={setLocalSearch}
        searchQ={searchQ}
        searchResults={searchResults}
        onCardClick={onCardClick}
      />
    </div>
  );
}
