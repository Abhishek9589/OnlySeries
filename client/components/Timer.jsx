import { useMemo, useEffect, useRef } from "react";
import { Clock } from "lucide-react";
import { gsap } from "gsap";

export default function Timer({ bookmarks, watchFilter }) {
  const timerRef = useRef(null);
  const prevFilterRef = useRef(watchFilter);
  const { totalMinutes, movieCount, seriesCount } = useMemo(() => {
    let movies = 0;
    let series = 0;
    let total = 0;
    const processedFranchises = new Set();

    bookmarks.forEach((item) => {
      if (item.type === "movie") {
        if (item.franchise) {
          // For franchise movies, only count once per franchise
          if (!processedFranchises.has(item.franchise)) {
            processedFranchises.add(item.franchise);
            movies++; // Count franchise as 1 movie unit

            // Calculate total runtime for all movies in this franchise
            const franchiseMovies = bookmarks.filter(b => b.franchise === item.franchise);
            const franchiseRuntime = franchiseMovies.reduce((sum, movie) => {
              return sum + (movie.runtime || 120);
            }, 0);
            total += franchiseRuntime;
          }
          // Skip individual franchise movies (already counted above)
        } else {
          // Regular individual movie
          movies++;
          total += (item.runtime || 120);
        }
      } else {
        // Series
        series++;
        const episodeCount = item.episodes || (item.seasons || 1) * 10;
        total += episodeCount * 45;
      }
    });

    return {
      totalMinutes: total,
      movieCount: movies,
      seriesCount: series,
    };
  }, [bookmarks]);

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

  // Animate timer when filter changes
  useEffect(() => {
    if (prevFilterRef.current !== watchFilter && timerRef.current) {
      gsap.fromTo(timerRef.current,
        { scale: 0.95, opacity: 0.7 },
        {
          scale: 1,
          opacity: 1,
          duration: 0.4,
          ease: "power2.out"
        }
      );
    }
    prevFilterRef.current = watchFilter;
  }, [watchFilter]);

  return (
    <div ref={timerRef} className="text-center">
      {/* Main Timer Display */}
      <div className="relative inline-block">
        <div className="text-6xl md:text-8xl font-mono font-bold text-transparent bg-gradient-to-r from-primary via-primary to-teal bg-clip-text mb-2 tracking-wider drop-shadow-lg transition-all duration-500">
          {time.days}:{time.hours}:{time.minutes}
        </div>
        <div className="absolute inset-0 text-6xl md:text-8xl font-mono font-bold text-primary/20 blur-sm -z-10 transition-all duration-500">
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

          {/* Filter Status */}
          {watchFilter && watchFilter !== "all" && (
            <div className="text-sm text-center">
              <span className="px-3 py-1 bg-primary/10 text-primary rounded-full border border-primary/20">
                {watchFilter === "watched" && "⏱️ Time Already Spent"}
                {watchFilter === "will-watch" && "📺 Time to Spend"}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
