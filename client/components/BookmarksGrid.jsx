import { useState, useEffect, useRef } from "react";
import { X, Clock, Star, Tv, Eye, EyeOff, Play } from "lucide-react";
import { gsap } from "gsap";
import FallbackImage from "./FallbackImage";

const PAGE_SIZE = 36;

export default function BookmarksGrid({
  bookmarks,
  sortType = "time_desc",
  onRemoveBookmark,
  onCardClick,
  onToggleWatchStatus,
  selectionMode = false,
  selectedKeys = [],
  onToggleSelect,
}) {
  const gridRef = useRef(null);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");

  useEffect(() => {
    // Animate new cards entering from center
    if (gridRef.current && bookmarks.length > 0) {
      const cards = Array.from(gridRef.current.children);
      const newCards = cards.slice(-1); // Get the last added card

      if (newCards.length > 0) {
        // Prevent scroll issues by using a more stable animation
        gsap.fromTo(
          newCards,
          {
            scale: 0.8,
            opacity: 0,
          },
          {
            scale: 1,
            opacity: 1,
            duration: 0.3,
            ease: "power2.out",
          },
        );
      }
    }
  }, [bookmarks.length]);

  const formatWatchTime = (item) => {
    if (item.type === "movie") {
      const totalMinutes = item.runtime || 120;
      const days = Math.floor(totalMinutes / (24 * 60));
      const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
      const minutes = totalMinutes % 60;

      if (days > 0) {
        return `${days}d ${hours}h ${minutes}m`;
      } else {
        return `${hours}h ${minutes}m`;
      }
    } else {
      const episodeCount = item.episodes || (item.seasons || 1) * 10;
      const totalMinutes = episodeCount * 45;
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

  const PaginationControls = () => (
    <div className="w-full flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs sm:text-sm text-muted-foreground">
      <button
        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
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
        }}
        inputMode="numeric"
        pattern="[0-9]*"
        className="w-14 sm:w-16 text-center px-2 py-1 rounded-md bg-card border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        aria-label="Page number"
      />
      <span>of {totalPages}</span>
      <button
        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
        disabled={currentPage >= totalPages}
        className="px-2 sm:px-3 py-1 rounded-md bg-card border border-border text-foreground hover:bg-card/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Next page"
      >
        Next
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      <PaginationControls />

      <div
        ref={gridRef}
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6 lg:gap-8 justify-items-center place-items-center"
      >
        {visibleCards.map((card) => {
          if (card.kind === "franchise") {
            const { franchise, movies } = card;
            return (
              <div
                key={card.franchiseKey}
                className="relative group cursor-pointer w-full max-w-[220px]"
                onMouseEnter={() => setHoveredCard(card.franchiseKey)}
                onMouseLeave={() => setHoveredCard(null)}
                onClick={() => onCardClick({ ...movies[0], franchise })}
              >
                <div className="relative aspect-[2/3] rounded-2xl overflow-hidden bg-gradient-to-br from-card via-card/90 to-card/80 border border-border/50 shadow-xl transition-all duration-300 group-hover:scale-105 group-hover:shadow-2xl group-hover:border-primary/30">
                  <FallbackImage
                    src={movies[0].poster}
                    alt={franchise}
                    type={movies[0].type}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

                  <div className="absolute top-3 right-3">
                    <div className="px-3 py-1 bg-primary/90 backdrop-blur-sm rounded-full text-xs font-medium text-primary-foreground shadow-lg">
                      Franchise
                    </div>
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <div className="text-white font-semibold text-base drop-shadow-lg">
                      {franchise}
                    </div>
                  </div>

                  {hoveredCard === card.franchiseKey && (
                    <div className="absolute inset-0 bg-black/80 flex flex-col justify-between p-4 backdrop-blur-sm">
                      <div className="flex justify-between items-start">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleWatchStatus(movies[0].id, movies[0].type);
                          }}
                          className={`p-2 rounded-lg transition-all ${
                            movies[0].watchStatus === "watched"
                              ? "bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30"
                              : "bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30"
                          }`}
                          title={movies[0].watchStatus === "watched" ? "Watched" : "Will Watch"}
                        >
                          {movies[0].watchStatus === "watched" ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={(e) =>
                            handleRemoveClick(e, movies[0].id, movies[0].type)
                          }
                          className="bg-destructive/90 backdrop-blur-sm text-white rounded-full p-2 hover:bg-destructive transition-colors shadow-lg"
                        >
                          <X className="w-4 h-4" />
                        </button>
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
              </div>
            );
          }

          const item = card.item;
          return (
            <div
              key={`${item.type}-${item.id}`}
              className={`relative group w-full max-w-[220px] ${selectionMode && item.type === "movie" ? "cursor-pointer" : "cursor-pointer"}`}
              onMouseEnter={() => setHoveredCard(`${item.type}-${item.id}`)}
              onMouseLeave={() => setHoveredCard(null)}
              onClick={() => {
                if (selectionMode && item.type === "movie") {
                  onToggleSelect && onToggleSelect(item);
                } else {
                  onCardClick(item);
                }
              }}
              onKeyDown={(e) => {
                if (selectionMode && item.type === "movie" && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  onToggleSelect && onToggleSelect(item);
                }
              }}
              role={selectionMode && item.type === "movie" ? "button" : undefined}
              tabIndex={selectionMode && item.type === "movie" ? 0 : -1}
              aria-pressed={selectionMode && item.type === "movie" ? isSelected(item) : undefined}
              aria-disabled={selectionMode && item.type !== "movie" ? true : undefined}
            >
              <div className={`relative aspect-[2/3] rounded-2xl overflow-hidden bg-card/80 backdrop-blur-sm border ${isSelected(item) ? "border-primary ring-2 ring-ring" : "border-border/30"} shadow-xl transition-all duration-300 group-hover:scale-105 group-hover:shadow-2xl`}>
                <FallbackImage
                  src={item.poster}
                  alt={item.title}
                  type={item.type}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                />

                {selectionMode && item.type === "movie" && (
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
                      className={`w-5 h-5 rounded-sm border bg-background focus:outline-none focus:ring-2 focus:ring-ring accent-primary ${isSelected(item) ? "border-primary" : "border-border"}`}
                    />
                  </label>
                )}

                {hoveredCard === `${item.type}-${item.id}` && !selectionMode && (
                  <div className="absolute inset-0 bg-black/80 flex flex-col justify-between p-4 backdrop-blur-sm">
                    <div className="flex justify-between items-start">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleWatchStatus(item.id, item.type);
                        }}
                        className={`p-2 rounded-lg transition-all ${
                          item.watchStatus === "watched"
                            ? "bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30"
                            : "bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30"
                        }`}
                        title={item.watchStatus === "watched" ? "Watched" : "Will Watch"}
                      >
                        {item.watchStatus === "watched" ? (
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

                    <div className="text-white space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span>{item.imdbRating}</span>
                      </div>

                      {item.type === "tv" ? (
                        <>
                          <div className="flex items-center gap-2 text-sm">
                            <Tv className="w-4 h-4" />
                            <span>
                              {item.seasons || 1} Season
                              {(item.seasons || 1) !== 1 ? "s" : ""}
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
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <PaginationControls />
    </div>
  );
}
