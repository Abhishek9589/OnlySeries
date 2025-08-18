import { useState, useEffect, useRef } from "react";
import { X, Clock, Star, Film, Tv, Calendar, Play, Eye, Check } from "lucide-react";
import { gsap } from "gsap";

export default function BookmarksGrid({
  bookmarks,
  onRemoveBookmark,
  onCardClick,
  onToggleWatchStatus,
}) {
  const gridRef = useRef(null);
  const [hoveredCard, setHoveredCard] = useState(null);

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

  // Calculate average rating for franchises
  const getAverageRating = (movies) => {
    const validRatings = movies
      .map((movie) => parseFloat(movie.imdbRating))
      .filter((rating) => !isNaN(rating) && rating > 0);

    if (validRatings.length === 0) return "N/A";

    const average =
      validRatings.reduce((sum, rating) => sum + rating, 0) /
      validRatings.length;
    return average.toFixed(1);
  };

  const handleRemoveClick = (e, id, type) => {
    e.stopPropagation();
    onRemoveBookmark(id, type);
  };

  if (bookmarks.length === 0) {
    return null;
  }

  return (
    <div className="space-y-8">
      {/* Individual Items Grid - Bigger Cards, Center-aligned */}
      <div
        ref={gridRef}
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-8 justify-items-center place-items-center"
      >
        {/* Render franchise cards */}
        {Object.entries(groupedBookmarks.franchises).map(
          ([franchise, movies]) => (
            <div
              key={`franchise-${franchise}`}
              className="relative group cursor-pointer w-full max-w-[220px]"
              onMouseEnter={() => setHoveredCard(`franchise-${franchise}`)}
              onMouseLeave={() => setHoveredCard(null)}
              onClick={() => onCardClick({ ...movies[0], franchise })}
            >
              <div className="relative aspect-[2/3] rounded-2xl overflow-hidden bg-gradient-to-br from-card via-card/90 to-card/80 border border-border/50 shadow-xl transition-all duration-300 group-hover:scale-105 group-hover:shadow-2xl group-hover:border-primary/30">
                <img
                  src={movies[0].poster}
                  alt={franchise}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                />

                {/* Gradient Overlay for better text visibility */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

                {/* Franchise Badge */}
                <div className="absolute top-3 right-3">
                  <div className="px-3 py-1 bg-primary/90 backdrop-blur-sm rounded-full text-xs font-medium text-primary-foreground shadow-lg">
                    Franchise
                  </div>
                </div>

                {/* Bottom Info Always Visible */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <div className="text-white font-semibold text-base drop-shadow-lg">
                    {franchise}
                  </div>
                </div>

                {/* Hover Overlay */}
                {hoveredCard === `franchise-${franchise}` && (
                  <div className="absolute inset-0 bg-black/80 flex flex-col justify-between p-4 backdrop-blur-sm">
                    <div className="flex justify-between items-start">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleWatchStatus(movies[0].id, movies[0].type);
                        }}
                        className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-all text-xs ${
                          movies[0].watchStatus === "watched"
                            ? "bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30"
                            : "bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30"
                        }`}
                      >
                        {movies[0].watchStatus === "watched" ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <Eye className="w-3 h-3" />
                        )}
                        <span className="font-medium">
                          {movies[0].watchStatus === "watched" ? "Watched" : "Will Watch"}
                        </span>
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
          ),
        )}

        {/* Render individual cards */}
        {groupedBookmarks.individual.map((item) => (
          <div
            key={`${item.type}-${item.id}`}
            className="relative group cursor-pointer w-full max-w-[220px]"
            onMouseEnter={() => setHoveredCard(`${item.type}-${item.id}`)}
            onMouseLeave={() => setHoveredCard(null)}
            onClick={() => onCardClick(item)}
          >
            <div className="relative aspect-[2/3] rounded-2xl overflow-hidden bg-card/80 backdrop-blur-sm border border-border/30 shadow-xl transition-all duration-300 group-hover:scale-105 group-hover:shadow-2xl">
              <img
                src={item.poster}
                alt={item.title}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
              />

              {/* Hover Overlay with specific info for movies vs series */}
              {hoveredCard === `${item.type}-${item.id}` && (
                <div className="absolute inset-0 bg-black/80 flex flex-col justify-between p-4 backdrop-blur-sm">
                  <div className="flex justify-between items-start">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleWatchStatus(item.id, item.type);
                      }}
                      className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-all text-xs ${
                        item.watchStatus === "watched"
                          ? "bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30"
                          : "bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30"
                      }`}
                    >
                      {item.watchStatus === "watched" ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        <Eye className="w-3 h-3" />
                      )}
                      <span className="font-medium">
                        {item.watchStatus === "watched" ? "Watched" : "Will Watch"}
                      </span>
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
                      // Series info
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
                      // Movie info - same pattern as series but without seasons/episodes
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
        ))}
      </div>
    </div>
  );
}
