import { useMemo } from "react";

export default function Timer({ bookmarks, watchFilter, typeFilter }) {
  const { totalMinutes, movieCount, seriesCount } = useMemo(() => {
    let movies = 0;
    let series = 0;

    // Filter bookmarks based on watch status and type for timer calculation
    const itemsToCount = bookmarks.filter(item => {
      if (watchFilter === "watched" && item.watchStatus !== "watched") return false;
      if (watchFilter === "unwatched" && item.watchStatus === "watched") return false;
      if (typeFilter && typeFilter !== "all" && item.type !== typeFilter) return false;
      return true;
    });

    const total = itemsToCount.reduce((total, item) => {
      try {
        if (item.type === "movie") {
          movies++;
          const runtime = Number.isFinite(item.runtime) ? item.runtime : (Number.isFinite(item.totalRuntimeMinutes) ? item.totalRuntimeMinutes : 120);
          return total + runtime;
        }

        // TV shows
        series++;

        // If totalRuntimeMinutes already computed, prefer it
        if (Number.isFinite(item.totalRuntimeMinutes) && item.totalRuntimeMinutes > 0) {
          return total + item.totalRuntimeMinutes;
        }

        // Determine episode count: prefer number_of_episodes, then episodes, then sum seasons' episode_count
        let episodeCount = null;
        if (Number.isFinite(item.number_of_episodes) && item.number_of_episodes > 0) {
          episodeCount = item.number_of_episodes;
        } else if (Number.isFinite(item.episodes) && item.episodes > 0) {
          episodeCount = item.episodes;
        } else if (Array.isArray(item.seasons) && item.seasons.length > 0) {
          const sum = item.seasons.reduce((s, ss) => s + (Number.isFinite(ss?.episode_count) ? ss.episode_count : 0), 0);
          if (sum > 0) episodeCount = sum;
        }

        // Determine per-episode runtime with TMDb priority
        let epRuntime = null;
        // 1) TMDb explicit per-episode runtimes (details were saved into item.episode_run_time or item.averageEpisodeRuntime)
        if (Array.isArray(item.episode_run_time) && item.episode_run_time.length > 0) {
          const runs = item.episode_run_time.filter(Number.isFinite);
          if (runs.length > 0) {
            const avgRun = Math.round(runs.reduce((a, c) => a + c, 0) / runs.length);
            // short-form anime detection
            const maxRun = Math.max(...runs);
            const genresList = Array.isArray(item.genres) ? item.genres.map(g => (typeof g === 'string' ? g.toLowerCase() : (g?.name || '').toLowerCase())) : [];
            const isAnime = genresList.includes('anime') || (genresList.includes('animation') && genresList.includes('japanese'));
            if (isAnime && avgRun <= 15) {
              epRuntime = 12;
            } else {
              epRuntime = avgRun;
            }
          }
        }

        // 2) item.averageEpisodeRuntime (might come from TMDb if set during enrichment)
        if (!Number.isFinite(epRuntime) && Number.isFinite(item.averageEpisodeRuntime) && item.averageEpisodeRuntime > 0) {
          epRuntime = item.averageEpisodeRuntime;
        }

        // 3) fallback to genre rules
        if (!Number.isFinite(epRuntime)) {
          const genresList = Array.isArray(item.genres) ? item.genres.map(g => (typeof g === 'string' ? g.toLowerCase() : (g?.name || '').toLowerCase())) : [];
          const isAnime = genresList.includes('anime') || (genresList.includes('animation') && genresList.includes('japanese'));
          const isCartoon = genresList.includes('animation') || genresList.some(n => n.includes('cartoon') || n.includes('kids'));
          const isComedy = genresList.includes('comedy') || genresList.includes('sitcom');
          const isDrama = genresList.includes('drama') || genresList.includes('action') || genresList.includes('thriller');

          if (isAnime) {
            epRuntime = 24;
          } else if (isComedy || isCartoon) {
            epRuntime = 24;
          } else if (isDrama) {
            const networks = Array.isArray(item.networks) ? item.networks.map(n => String(n?.name || '').toLowerCase()) : [];
            const streamingProviders = ["netflix", "hulu", "amazon", "prime video", "prime", "disney+", "apple tv+", "hbomax", "paramount+", "peacock", "max"];
            const isStreaming = networks.some(n => streamingProviders.some(p => n.includes(p)));
            epRuntime = isStreaming ? 55 : 45;
          } else if (Number.isFinite(item.episode_run_time) && item.episode_run_time > 0) {
            epRuntime = item.episode_run_time;
          } else {
            epRuntime = 45;
          }
        }

        // If episodeCount unknown, fall back to seasons * 10 or 10 episodes
        if (!Number.isFinite(episodeCount) || episodeCount <= 0) {
          const seasonsCount = Number.isFinite(item.seasons) ? item.seasons : (Number.isFinite(item.number_of_seasons) ? item.number_of_seasons : (Array.isArray(item.seasons) ? item.seasons.length : null));
          if (Number.isFinite(seasonsCount) && seasonsCount > 0) {
            episodeCount = seasonsCount * 10;
          } else {
            episodeCount = 10;
          }
        }

        return total + (episodeCount * epRuntime);
      } catch (err) {
        console.error('Timer calc error for item', item, err);
        return total;
      }
    }, 0);

    return {
      totalMinutes: total,
      movieCount: movies,
      seriesCount: series,
    };
  }, [bookmarks, watchFilter, typeFilter]);

  const formatTime = (minutes) => {
    const MIN_PER_HOUR = 60;
    const HOUR_PER_DAY = 24;
    const DAY_PER_YEAR = 365;

    const minutesPerDay = HOUR_PER_DAY * MIN_PER_HOUR;
    const minutesPerYear = DAY_PER_YEAR * minutesPerDay;

    const years = Math.floor(minutes / minutesPerYear);
    const remAfterYears = minutes % minutesPerYear;

    const days = Math.floor(remAfterYears / minutesPerDay);
    const remAfterDays = remAfterYears % minutesPerDay;

    const hours = Math.floor(remAfterDays / MIN_PER_HOUR);
    const mins = remAfterDays % MIN_PER_HOUR;

    return {
      years: years.toString().padStart(2, "0"),
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
        <div className="text-5xl sm:text-6xl md:text-8xl font-mono font-bold text-transparent bg-gradient-to-r from-primary via-primary to-teal bg-clip-text mb-2 tracking-wider drop-shadow-lg">
          {time.years}:{time.days}:{time.hours}:{time.minutes}
        </div>
        <div className="absolute inset-0 text-5xl sm:text-6xl md:text-8xl font-mono font-bold text-primary/20 blur-sm -z-10">
          {time.years}:{time.days}:{time.hours}:{time.minutes}
        </div>
      </div>

      {/* Labels */}
      <div className="flex justify-center items-center gap-4 sm:gap-8 mb-4 text-xs sm:text-sm text-muted-foreground">
        <span>Yr</span>
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
