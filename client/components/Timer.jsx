import { useMemo } from "react";
import { Clock } from "lucide-react";

export default function Timer({ bookmarks, watchFilter }) {
  const { totalMinutes, movieCount, seriesCount } = useMemo(() => {
    let movies = 0;
    let series = 0;

    // Filter bookmarks based on watch status for timer calculation
    const itemsToCount = bookmarks.filter(item => {
      if (watchFilter === "watched") return item.watchStatus === "watched";
      if (watchFilter === "unwatched") return item.watchStatus !== "watched";
      if (watchFilter === "all") return true; // Count ALL items regardless of status
      return true; // Default: count all items
    });

    const total = itemsToCount.reduce((total, item) => {
      if (item.type === "movie") {
        movies++;
        return total + (item.runtime || 120); // Default 2 hours if no runtime
      } else {
        series++;
        // For series: episodes * average runtime (assume 45 min per episode)
        const episodeCount = item.episodes || (item.seasons || 1) * 10; // Default 10 episodes per season
        return total + episodeCount * 45;
      }
    }, 0);

    return {
      totalMinutes: total,
      movieCount: movies,
      seriesCount: series,
    };
  }, [bookmarks, watchFilter]);

  const formatTime = (minutes) => {
    const days = Math.floor(minutes / (24 * 60));
    const hours = Math.floor((minutes % (24 * 60)) / 60);
    const mins = minutes % 60;

    return {
      days: days.toString().padStart(2, "0"),
      hours: hours.toString().padStart(2, "0"),
      minutes: mins.toString().padStart(2, "0"),
    };
  };

  const time = formatTime(totalMinutes);

  return (
    <div className="text-center">
      {/* Main Timer Display */}
      <div className="relative inline-block">
        <div className="text-6xl md:text-8xl font-mono font-bold text-transparent bg-gradient-to-r from-primary via-primary to-teal bg-clip-text mb-2 tracking-wider drop-shadow-lg">
          {time.days}:{time.hours}:{time.minutes}
        </div>
        <div className="absolute inset-0 text-6xl md:text-8xl font-mono font-bold text-primary/20 blur-sm -z-10">
          {time.days}:{time.hours}:{time.minutes}
        </div>
      </div>

      {/* Labels */}
      <div className="flex justify-center items-center gap-8 mb-4 text-sm text-muted-foreground">
        <span>Day</span>
        <span>Hr</span>
        <span>Min</span>
      </div>

      {bookmarks.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
            {movieCount > 0 && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-primary"></div>
                <span>
                  {movieCount} movie{movieCount !== 1 ? "s" : ""}
                </span>
              </div>
            )}
            {seriesCount > 0 && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-teal"></div>
                <span>{seriesCount} series</span>
              </div>
            )}
          </div>

          {/* Active Filter Indicator */}
          {watchFilter !== "all" && (
            <div className="flex items-center justify-center">
              <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                watchFilter === "watched"
                  ? "bg-green-500/20 text-green-400"
                  : "bg-blue-500/20 text-blue-400"
              }`}>
                <div className={`w-1.5 h-1.5 rounded-full ${
                  watchFilter === "watched" ? "bg-green-400" : "bg-blue-400"
                }`}></div>
                <span>
                  {watchFilter === "watched" ? "Watched" : "Will Watch"} filter active
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
