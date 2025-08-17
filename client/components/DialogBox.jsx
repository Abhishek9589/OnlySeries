import { useState, useEffect, useRef } from "react";
import { X, Clock, Star, Film, Tv, Calendar, Eye, Check } from "lucide-react";
import { gsap } from "gsap";
import EpisodeRatingGrid from "./EpisodeRatingGrid";
import { getPlatformInfo } from "../lib/streaming";

export default function DialogBox({
  item,
  isOpen,
  onClose,
  onRemove,
  onToggleWatchStatus,
  franchiseMovies,
}) {
  const dialogRef = useRef(null);
  const overlayRef = useRef(null);

  useEffect(() => {
    if (isOpen && dialogRef.current && overlayRef.current) {
      // Animate dialog in
      gsap.fromTo(
        overlayRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.3 },
      );
      gsap.fromTo(
        dialogRef.current,
        { scale: 0.9, opacity: 0, y: 20 },
        { scale: 1, opacity: 1, y: 0, duration: 0.4, ease: "power2.out" },
      );
    }
  }, [isOpen]);

  const handleClose = () => {
    if (dialogRef.current && overlayRef.current) {
      gsap.to(overlayRef.current, { opacity: 0, duration: 0.2 });
      gsap.to(dialogRef.current, {
        scale: 0.9,
        opacity: 0,
        y: 20,
        duration: 0.3,
        onComplete: onClose,
      });
    } else {
      onClose();
    }
  };

  const formatWatchTime = (runtime) => {
    const hours = Math.floor(runtime / 60);
    const minutes = runtime % 60;
    return `${hours}h ${minutes}m`;
  };

  if (!isOpen || !item) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={handleClose}
    >
      <div
        ref={dialogRef}
        className="bg-card/95 backdrop-blur-md border border-border/50 rounded-3xl max-w-6xl max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative p-6 border-b border-border/30">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary/10 rounded-xl">
                {item.type === "movie" ? (
                  <Film className="w-6 h-6 text-primary" />
                ) : (
                  <Tv className="w-6 h-6 text-primary" />
                )}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-1">
                  {item.franchise || item.title}
                </h2>
                <div className="space-y-3">
                  <div className="flex items-center gap-4 text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {item.year}
                    </span>
                    <span className="capitalize">
                      {item.franchise
                        ? `${franchiseMovies?.length || 0} movies`
                        : item.type}
                    </span>
                    {item.franchise && franchiseMovies ? (
                      <span className="flex items-center gap-1 text-primary">
                        <Star className="w-4 h-4 fill-current" />
                        {(() => {
                          const validRatings = franchiseMovies
                            .map((movie) => parseFloat(movie.imdbRating))
                            .filter((rating) => !isNaN(rating) && rating > 0);
                          if (validRatings.length === 0) return "N/A";
                          const average = validRatings.reduce((sum, rating) => sum + rating, 0) / validRatings.length;
                          return average.toFixed(1);
                        })()}
                      </span>
                    ) : item.imdbRating !== "N/A" ? (
                      <span className="flex items-center gap-1 text-primary">
                        <Star className="w-4 h-4 fill-current" />
                        {item.imdbRating}
                      </span>
                    ) : null}
                  </div>

                  {/* Watch Status Toggle and Streaming Platforms */}
                  <div className="flex items-center gap-4">
                    {/* Watch Status Toggle */}
                    {onToggleWatchStatus && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onToggleWatchStatus(item.id, item.type);
                        }}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                          item.watchStatus === "watched"
                            ? "bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30"
                            : "bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30"
                        }`}
                      >
                        {item.watchStatus === "watched" ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                        <span className="text-sm font-medium">
                          {item.watchStatus === "watched" ? "Watched" : "Will Watch"}
                        </span>
                      </button>
                    )}

                    {/* Streaming Platforms */}
                    {item.streamingPlatforms && item.streamingPlatforms.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm text-muted-foreground">Available on:</span>
                        <div className="flex gap-2 flex-wrap">
                          {item.streamingPlatforms.slice(0, 4).map((platform) => {
                            const platformInfo = getPlatformInfo(platform);
                            return platformInfo ? (
                              <span
                                key={platform}
                                className="px-2 py-1 rounded-md text-xs font-medium border"
                                style={{
                                  backgroundColor: platformInfo.color + "15",
                                  borderColor: platformInfo.color + "30",
                                  color: platformInfo.color
                                }}
                              >
                                {platformInfo.name}
                              </span>
                            ) : null;
                          })}
                          {item.streamingPlatforms.length > 4 && (
                            <span
                              className="px-2 py-1 rounded-md text-xs font-medium bg-muted text-muted-foreground border border-border"
                              title={`+${item.streamingPlatforms.length - 4} more platforms`}
                            >
                              +{item.streamingPlatforms.length - 4} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-secondary/50 rounded-xl transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Movie Dialog */}
          {item.type === "movie" && !item.franchise && (
            <div className="flex gap-8">
              <div className="flex-shrink-0">
                <img
                  src={item.poster}
                  alt={item.title}
                  className="w-64 h-96 object-cover rounded-2xl shadow-lg"
                />
              </div>
              <div className="flex-1 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-secondary/30 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                      <Star className="w-4 h-4" />
                      <span className="text-sm font-medium">IMDb Rating</span>
                    </div>
                    <div className="text-2xl font-bold text-primary">
                      {item.imdbRating}
                    </div>
                  </div>
                  <div className="bg-secondary/30 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm font-medium">Duration</span>
                    </div>
                    <div className="text-2xl font-bold text-foreground">
                      {formatWatchTime(item.runtime || 120)}
                    </div>
                  </div>
                </div>

                {onRemove && (
                  <button
                    onClick={() => {
                      onRemove(item.id, item.type);
                      handleClose();
                    }}
                    className="px-6 py-3 bg-destructive/90 hover:bg-destructive text-destructive-foreground rounded-xl transition-colors font-medium"
                  >
                    Remove from Watchlist
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Franchise Dialog */}
          {item.franchise && franchiseMovies && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {franchiseMovies.sort((a, b) => parseInt(a.year) - parseInt(b.year)).map((movie) => (
                  <div key={movie.id} className="group relative">
                    <div className="aspect-[2/3] rounded-xl overflow-hidden bg-card border border-border/30 shadow-lg transition-all duration-300 group-hover:scale-105">
                      <img
                        src={movie.poster}
                        alt={movie.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        {/* Remove button at top right */}
                        {onRemove && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemove(movie.id, movie.type);
                            }}
                            className="absolute top-2 right-2 bg-destructive/90 backdrop-blur-sm text-white rounded-full p-1.5 hover:bg-destructive transition-colors shadow-lg"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}

                        {/* Movie info at bottom */}
                        <div className="absolute bottom-0 left-0 right-0 p-3 space-y-2">
                          <div className="text-white text-sm font-medium">
                            {movie.title}
                          </div>

                          <div className="flex items-center gap-2 text-xs text-white/90">
                            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                            <span>{movie.imdbRating}</span>
                          </div>

                          <div className="flex items-center gap-2 text-xs text-white/90">
                            <Clock className="w-3 h-3" />
                            <span>{formatWatchTime(movie.runtime || 120)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 text-center">
                      <div className="font-medium text-sm text-foreground truncate">
                        {movie.title}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {movie.year}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Series Dialog */}
          {item.type === "tv" && !item.franchise && (
            <div className="space-y-6">
              <div className="flex gap-8">
                <div className="flex-shrink-0">
                </div>
                <div className="flex-1 space-y-6">
                </div>
              </div>

              {/* Episode Ratings Grid */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-foreground">
                  Episode Ratings
                </h3>
                <EpisodeRatingGrid tvId={item.id} seasons={item.seasons || 1} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
