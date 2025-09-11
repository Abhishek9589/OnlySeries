import { useState, useEffect, useMemo, useRef } from "react";
import { MoreHorizontal, Filter, Eye, EyeOff, ArrowUpDown, RefreshCw, Tv, Play } from "lucide-react";
import SearchBar from "../components/SearchBar";
import Timer from "../components/Timer";
import BookmarksGrid from "../components/BookmarksGrid";
import DialogBox from "../components/DialogBox";
import OfflineBanner from "../components/OfflineBanner";
import ScrollToTop from "../components/ScrollToTop";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";

import { getMovieDetails, getTVDetails, getIMDbRating } from "../lib/api";
import ConfirmDialog from "../components/ConfirmDialog";

export default function Index() {
  const [bookmarks, setBookmarks] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [backgroundImage, setBackgroundImage] = useState("");
  const [watchFilter, setWatchFilter] = useState("all"); // "all", "watched", "unwatched"
  const [typeFilter, setTypeFilter] = useState("all"); // "all", "movie", "tv"
  const [shareToast, setShareToast] = useState(false);
  const [sortType, setSortType] = useState("time_desc");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [showFranchiseDialog, setShowFranchiseDialog] = useState(false);
  const [franchiseName, setFranchiseName] = useState("");
  const [franchiseFilter, setFranchiseFilter] = useState("");

  // Diagnostic: missing OMDb/IMDb ratings
  const [missingRatings, setMissingRatings] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [fetchingRatings, setFetchingRatings] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const UI_STATE_KEY = "onlyseries-ui-v1";
  const fileInputRef = useRef(null);

  // Restore UI state (filters, sort, selection mode) so app returns to last-used view
  useEffect(() => {
    try {
      const raw = localStorage.getItem(UI_STATE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.watchFilter) setWatchFilter(parsed.watchFilter);
        if (parsed.typeFilter) setTypeFilter(parsed.typeFilter);
        if (parsed.sortType) setSortType(parsed.sortType);
        if (typeof parsed.selectionMode === "boolean") setSelectionMode(parsed.selectionMode);
      }
    } catch (e) {
      console.warn("Failed to restore UI state", e);
    }
  }, []);

  // Persist UI state whenever relevant values change
  useEffect(() => {
    try {
      const toSave = { watchFilter, typeFilter, sortType, selectionMode };
      localStorage.setItem(UI_STATE_KEY, JSON.stringify(toSave));
    } catch (e) {
      // ignore
    }
  }, [watchFilter, typeFilter, sortType, selectionMode]);

  const franchiseCounts = useMemo(() => {
    const map = new Map();
    bookmarks
      .filter((b) => b.type === "movie" && b.franchise)
      .forEach((b) => {
        const name = String(b.franchise || "").trim();
        if (!name) return;
        map.set(name, (map.get(name) || 0) + 1);
      });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [bookmarks]);

  // Load bookmarks from localStorage on mount
  useEffect(() => {
    const savedBookmarks = localStorage.getItem("onlyseries-bookmarks");
    const migratedFlag = localStorage.getItem("onlyseries-franchise-migrated-v1");
    if (savedBookmarks) {
      const parsed = JSON.parse(savedBookmarks);
      if (!migratedFlag) {
        const cleared = Array.isArray(parsed)
          ? parsed.map((it, i) => ({
              ...it,
              franchise: undefined,
              addedAt: it.addedAt ?? (Date.now() - (parsed.length - i)),
            }))
          : [];
        setBookmarks(cleared);
        localStorage.setItem("onlyseries-franchise-migrated-v1", "true");
        if (cleared.length > 0) {
          setBackgroundImage(cleared[cleared.length - 1].poster);
        }
      } else {
        const withAdded = Array.isArray(parsed)
          ? parsed.map((it, i) => ({
              ...it,
              addedAt: it.addedAt ?? (Date.now() - (parsed.length - i)),
            }))
          : [];
        setBookmarks(withAdded);
        if (withAdded.length > 0) {
          setBackgroundImage(withAdded[withAdded.length - 1].poster);
        }
      }
    }
  }, []);

  // Normalize missing addedAt once to keep time-based sorting stable
  useEffect(() => {
    if (!Array.isArray(bookmarks) || bookmarks.length === 0) return;
    const hasMissing = bookmarks.some((b) => typeof b.addedAt !== "number" || !Number.isFinite(b.addedAt));
    if (hasMissing) {
      const base = Date.now() - bookmarks.length;
      const withAdded = bookmarks.map((it, i) => ({
        ...it,
        addedAt: (typeof it.addedAt === "number" && Number.isFinite(it.addedAt)) ? it.addedAt : (base + i),
      }));
      setBookmarks(withAdded);
    }
  }, [bookmarks]);

  // Lock main page scroll when any dialog or modal is open so only the modal scrollbar is used
  useEffect(() => {
    const anyOpen = dialogOpen || showFranchiseDialog || showResetConfirm;
    if (typeof document === 'undefined') return;
    if (anyOpen) {
      // remember previous overflow
      document.body.dataset._prevOverflow = document.body.style.overflow || '';
      document.body.style.overflow = 'hidden';
    } else {
      const prev = document.body.dataset._prevOverflow || '';
      document.body.style.overflow = prev;
      delete document.body.dataset._prevOverflow;
    }
    return () => {
      const prev = document.body.dataset._prevOverflow || '';
      document.body.style.overflow = prev;
      delete document.body.dataset._prevOverflow;
    };
  }, [dialogOpen, showFranchiseDialog, showResetConfirm]);

  // Save bookmarks to localStorage whenever bookmarks change
  useEffect(() => {
    localStorage.setItem("onlyseries-bookmarks", JSON.stringify(bookmarks));
    // Update background image when bookmarks change
    if (bookmarks.length > 0) {
      setBackgroundImage(bookmarks[bookmarks.length - 1].poster);
    } else {
      setBackgroundImage("");
    }
  }, [bookmarks]);

  // Enrich bookmarks with accurate runtimes/episode counts from TMDb when missing
  useEffect(() => {
    let cancelled = false;

    const needsEnrichment = bookmarks.some((b) => {
      if (b.type === "movie") {
        // Enrich when runtime missing OR imdbRating missing/unknown
        return (!b.runtime || b.runtime <= 0) || (!b.imdbRating || b.imdbRating === "N/A");
      }
      if (b.type === "tv") {
        // Enrich when episodes/runtime or imdbRating missing
        return (!Number.isFinite(b.episodes) || !Number.isFinite(b.averageEpisodeRuntime)) || (!b.imdbRating || b.imdbRating === "N/A");
      }
      return false;
    });

    if (!needsEnrichment) return;

    const enrich = async () => {
      try {
        // Concurrency limit to avoid blasting the APIs when a large number of bookmarks exist
        const concurrency = 6;
        const results = new Array(bookmarks.length);
        let nextIndex = 0;

        const worker = async () => {
          while (true) {
            if (cancelled) return;
            const i = nextIndex++;
            if (i >= bookmarks.length) return;
            const b = bookmarks[i];

            try {
              if (b.type === "movie") {
                const details = await getMovieDetails(b.id).catch(() => null);
                const runtime = Number.isFinite(details?.runtime) ? details.runtime : (Number.isFinite(b.runtime) ? b.runtime : 120);

                let imdbRating = b.imdbRating;
                if (!imdbRating || imdbRating === "N/A") {
                  try {
                    const imdbId = details?.external_ids?.imdb_id;
                    const year = details?.release_date ? String(new Date(details.release_date).getFullYear()) : b.year;
                    const omdbRating = await getIMDbRating({ imdbId, title: details?.title || b.title, year });
                    if (omdbRating && omdbRating !== "N/A") {
                      imdbRating = omdbRating;
                    } else {
                      const tmdbRating = typeof details?.vote_average === 'number' ? String(details.vote_average.toFixed(1)) : undefined;
                      imdbRating = tmdbRating || (b.imdbRating || "N/A");
                    }
                  } catch (e) {
                    const tmdbRating = typeof details?.vote_average === 'number' ? String(details.vote_average.toFixed(1)) : undefined;
                    imdbRating = tmdbRating || (b.imdbRating || "N/A");
                  }
                }

                results[i] = { ...b, runtime, imdbRating };
                continue;
              }

              if (b.type === "tv") {
                const details = await getTVDetails(b.id).catch(() => null);

                let numEpisodes = null;
                if (Number.isFinite(details?.number_of_episodes)) {
                  numEpisodes = details.number_of_episodes;
                } else if (Array.isArray(details?.seasons) && details.seasons.length > 0) {
                  const sum = details.seasons.reduce((s, ss) => s + (Number.isFinite(ss?.episode_count) ? ss.episode_count : 0), 0);
                  if (sum > 0) {
                    numEpisodes = sum;
                  }
                }

                if (!Number.isFinite(numEpisodes)) {
                  if (Number.isFinite(b.episodes)) {
                    numEpisodes = b.episodes;
                  } else if (Number.isFinite(details?.number_of_seasons)) {
                    numEpisodes = (details.number_of_seasons || 1) * 10;
                  } else {
                    numEpisodes = (b.seasons || 1) * 10;
                  }
                }

                let avgRuntime = undefined;
                // Prefer TMDb explicit episode runtimes when available
                if (Array.isArray(details?.episode_run_time) && details.episode_run_time.length > 0) {
                  const runs = details.episode_run_time.filter(Number.isFinite);
                  if (runs.length > 0) avgRuntime = Math.round(runs.reduce((a, c) => a + c, 0) / runs.length);
                } else if (Number.isFinite(details?.episode_run_time)) {
                  avgRuntime = details.episode_run_time;
                }

                // If still not available, prefer any bookmark-provided avg
                if (!Number.isFinite(avgRuntime) && Number.isFinite(b.averageEpisodeRuntime)) {
                  avgRuntime = b.averageEpisodeRuntime;
                }

                // Keep original episode_run_time array for storing back to bookmark
                const epRunArr = Array.isArray(details?.episode_run_time)
                  ? details.episode_run_time
                  : (Array.isArray(b.episode_run_time) ? b.episode_run_time : []);

                // Build genres list
                const genres = Array.isArray(details?.genres)
                  ? details.genres.map((g) => String(g?.name || "").toLowerCase())
                  : (Array.isArray(b.genres) ? b.genres.map((g) => String(g?.name || g || "").toLowerCase()) : []);

                // Helper to detect streaming networks
                const streamingProviders = ["netflix", "hulu", "amazon", "prime video", "prime", "disney+", "apple tv+", "hbomax", "paramount+", "peacock", "max"];
                const networks = Array.isArray(details?.networks) ? details.networks.map(n => String(n?.name || '').toLowerCase()) : [];
                const isStreaming = networks.some(n => streamingProviders.some(p => n.includes(p)));

                const isAnime = genres.includes("anime") || (genres.includes("animation") && genres.includes("japanese"));
                const isCartoon = genres.includes("animation") || genres.some(n => n.includes("cartoon") || n.includes("kids"));
                const isComedy = genres.includes("comedy") || genres.includes("sitcom");
                const isDrama = genres.includes("drama") || genres.includes("action") || genres.includes("thriller");

                const calcAvgFromArray = (arr) => Math.round(arr.reduce((a, c) => a + c, 0) / arr.length);

                if (!Number.isFinite(avgRuntime)) {
                  // Short-form anime detection: if episode runtimes provided and all <= 15
                  if (Array.isArray(details?.episode_run_time) && details.episode_run_time.length > 0) {
                    const runs = details.episode_run_time.filter(Number.isFinite);
                    if (runs.length > 0) {
                      const maxRun = Math.max(...runs);
                      const avgRun = calcAvgFromArray(runs);
                      if (avgRun <= 15 || maxRun <= 15) {
                        avgRuntime = 12; // short-form anime
                      } else {
                        avgRuntime = avgRun;
                      }
                    }
                  } else if (isAnime) {
                    avgRuntime = 24; // standard anime
                  } else if (isCartoon) {
                    avgRuntime = 24; // western cartoons
                  } else if (isComedy) {
                    avgRuntime = 24; // sitcom/comedy
                  } else if (isDrama) {
                    // Streaming drama gets longer runtime
                    if (isStreaming) {
                      avgRuntime = 55; // mid of 50-60
                    } else {
                      avgRuntime = 45;
                    }
                  } else if (Number.isFinite(b.episode_run_time)) {
                    avgRuntime = b.episode_run_time;
                  } else {
                    avgRuntime = 45; // sensible fallback
                  }
                }

                // Total runtime in minutes for the show
                const totalMinutes = Number.isFinite(numEpisodes) && Number.isFinite(avgRuntime) ? (numEpisodes * avgRuntime) : null;

                let imdbRating = b.imdbRating;
                if (!imdbRating || imdbRating === "N/A") {
                  try {
                    const imdbId = details?.external_ids?.imdb_id;
                    const year = details?.first_air_date ? String(new Date(details.first_air_date).getFullYear()) : b.year;
                    const omdbRating = await getIMDbRating({ imdbId, title: details?.name || b.title, year });
                    if (omdbRating && omdbRating !== "N/A") {
                      imdbRating = omdbRating;
                    }
                  } catch (e) {
                    // ignore and fallback later
                  }
                }

                const tmdbRating = typeof details?.vote_average === 'number' ? String(details.vote_average.toFixed(1)) : undefined;

                results[i] = {
                  ...b,
                  genres: Array.isArray(details?.genres) ? details.genres : (Array.isArray(b.genres) ? b.genres : []),
                  seasons: Number.isFinite(details?.number_of_seasons) ? details.number_of_seasons : (Array.isArray(details?.seasons) ? details.seasons.length : (Number.isFinite(b.seasons) ? b.seasons : undefined)),
                  number_of_seasons: Number.isFinite(details?.number_of_seasons) ? details.number_of_seasons : undefined,
                  episodes: numEpisodes,
                  averageEpisodeRuntime: avgRuntime,
                  episode_run_time: epRunArr,
                  totalRuntimeMinutes: totalMinutes,
                  imdbRating: (!imdbRating || imdbRating === "N/A") ? (tmdbRating || b.imdbRating || "N/A") : imdbRating,
                };

                continue;
              }

              // Unknown type - keep as is
              results[i] = b;
            } catch (err) {
              console.error('Error enriching item', b, err);
              results[i] = b;
            }
          }
        };

        const workers = Array.from({ length: Math.min(concurrency, bookmarks.length) }).map(() => worker());
        await Promise.all(workers);

        if (!cancelled) {
          const updated = results;
          const changed = updated.some((u, i) => {
            const orig = bookmarks[i];
            if (!orig) return true;
            return u.runtime !== orig.runtime || u.seasons !== orig.seasons || u.episodes !== orig.episodes || u.averageEpisodeRuntime !== orig.averageEpisodeRuntime || u.imdbRating !== orig.imdbRating || u.totalRuntimeMinutes !== orig.totalRuntimeMinutes;
          });
          if (changed) setBookmarks(updated);
        }
      } catch (e) {
        console.error("Failed enriching bookmarks:", e);
      }
    };

    enrich();

    return () => {
      cancelled = true;
    };
  }, [bookmarks]);



  const handleAddBookmark = (item) => {
    // Check if item already exists
    const exists = bookmarks.some(
      (bookmark) => bookmark.id === item.id && bookmark.type === item.type,
    );

    if (!exists) {
      setBookmarks((prev) => {
        const newItem = {
          ...item,
          franchise: undefined,
          watchStatus: "unwatched",
          addedAt: Date.now(),
        };
        return [...prev, newItem];
      });
    }
  };

  const handleRemoveBookmark = (id, type) => {
    setBookmarks((prev) =>
      prev.filter((item) => !(item.id === id && item.type === type)),
    );
  };

  // Update a specific bookmark with a patch object
  const updateBookmark = (id, type, patch) => {
    setBookmarks((prev) => prev.map((b) => (b.id === id && b.type === type ? { ...b, ...patch } : b)));
  };

  const handleToggleWatchStatus = (id, type) => {
    setBookmarks((prev) => {
      return prev.map((item) => {
        // Only update the specific item that was clicked
        if (item.id === id && item.type === type) {
          const newStatus = item.watchStatus === "watched" ? "unwatched" : "watched";
          return { ...item, watchStatus: newStatus };
        }
        return item;
      });
    });
  };

  const handleCardClick = (item) => {
    setSelectedItem(item);
    setDialogOpen(true);
  };

  const downloadBookmarks = () => {
    const dataStr = JSON.stringify(bookmarks, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "onlyseries-bookmarks.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const uploadBookmarks = (event) => {
    const inputEl = event.target;
    const file = inputEl?.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const uploaded = JSON.parse(e.target?.result);
          if (Array.isArray(uploaded)) {
            const base = Date.now() - uploaded.length;
            const normalized = uploaded.map((it, i) => ({
              ...it,
              addedAt: it.addedAt ?? (base + i),
            }));
            setBookmarks(normalized);
          }
        } catch (error) {
          console.error("Error parsing uploaded file:", error);
        } finally {
          if (inputEl) inputEl.value = "";
        }
      };
      reader.readAsText(file);
    } else {
      if (inputEl) inputEl.value = "";
    }
  };

  // Filter bookmarks based on watch status and type (movie/tv)
  const filteredBookmarks = bookmarks.filter(item => {
    if (watchFilter === "watched" && item.watchStatus !== "watched") return false;
    if (watchFilter === "unwatched" && item.watchStatus === "watched") return false;
    if (typeFilter && typeFilter !== "all" && item.type !== typeFilter) return false;
    return true;
  });

  const hasBookmarks = bookmarks.length > 0;

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Offline Banner */}
      <OfflineBanner />

      {/* Background Image with Simple Blur */}
      {backgroundImage && (
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url(${backgroundImage})`,
            filter: "blur(10px)",
          }}
        />
      )}

      {/* Main Content */}
      <div className="relative z-10 min-h-screen bg-background/90">
        <div className="container mx-auto px-4 py-8">
          {/* Header - Only shown when no bookmarks */}
          {!hasBookmarks && (
            <div className="text-center mb-16 mt-20">
              <h1 className="text-5xl md:text-7xl font-bold mb-4 bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent leading-tight">
                only<span className="text-primary">series</span>.towatch
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground">
                Track, Bookmark & Watch Smarter
              </p>
            </div>
          )}

          {/* Import/Export and Filter Controls - Fixed position */}
          <div className="fixed top-4 left-1/2 -translate-x-1/2 md:top-6 md:right-6 md:left-auto md:translate-x-0 z-50 flex gap-2 justify-center">
            <input ref={fileInputRef} type="file" accept=".json" onChange={uploadBookmarks} className="hidden" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={`p-2 md:p-3 backdrop-blur-sm text-card-foreground rounded-full hover:bg-card transition-colors shadow-lg border border-border/50 relative ${
                    watchFilter === "all" ? "bg-card/80" :
                    watchFilter === "watched" ? "bg-green-500/80" : "bg-blue-500/80"
                  }`}
                  title="Filter watchlist"
                >
                  <Filter className="w-4 h-4 md:w-5 md:h-5" />
                  {watchFilter !== "all" && (
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-primary"></div>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem
                  onClick={() => setWatchFilter("all")}
                  className={watchFilter === "all" ? "bg-accent" : ""}
                >
                  <Filter className="w-4 h-4" />
                  All Items
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setWatchFilter("unwatched")}
                  className={watchFilter === "unwatched" ? "bg-blue-500/20 text-blue-400" : ""}
                >
                  <Eye className="w-4 h-4 text-blue-400" />
                  Will Watch
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setWatchFilter("watched")}
                  className={watchFilter === "watched" ? "bg-green-500/20 text-green-400" : ""}
                >
                  <EyeOff className="w-4 h-4 text-green-400" />
                  Watched
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={`p-2 md:p-3 backdrop-blur-sm text-card-foreground rounded-full hover:bg-card transition-colors shadow-lg border border-border/50 relative ${
                    typeFilter === "all" ? "bg-card/80" : typeFilter === "movie" ? "bg-blue-500/80" : "bg-purple-500/80"
                  }`}
                  title="Filter type"
                >
                  <Tv className="w-4 h-4 md:w-5 md:h-5" />
                  {typeFilter !== "all" && (
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-primary"></div>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={() => setTypeFilter("all")} className={typeFilter === "all" ? "bg-accent" : ""}>
                  All
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTypeFilter("movie")} className={typeFilter === "movie" ? "bg-blue-500/20 text-blue-400" : ""}>
                  Movies
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTypeFilter("tv")} className={typeFilter === "tv" ? "bg-purple-500/20 text-purple-400" : ""}>
                  Series
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="p-2 md:p-3 bg-card/80 backdrop-blur-sm text-card-foreground rounded-full hover:bg-card transition-colors shadow-lg border border-border/50"
                  title="Sort"
                >
                  <ArrowUpDown className="w-4 h-4 md:w-5 md:h-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => setSortType("alpha_asc")} className={sortType === "alpha_asc" ? "bg-accent" : ""}>
                  A → Z (Title)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortType("alpha_desc")} className={sortType === "alpha_desc" ? "bg-accent" : ""}>
                  Z → A (Title)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortType("time_asc")} className={sortType === "time_asc" ? "bg-accent" : ""}>
                  Time added: First → Last
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortType("time_desc")} className={sortType === "time_desc" ? "bg-accent" : ""}>
                  Time added: Last → First
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>


            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="p-2 md:p-3 bg-card/80 backdrop-blur-sm text-card-foreground rounded-full hover:bg-card transition-colors shadow-lg border border-border/50"
                  title="More"
                >
                  <MoreHorizontal className="w-4 h-4 md:w-5 md:h-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    setShareToast(true);
                    setTimeout(() => setShareToast(false), 3000);
                  }}
                >
                  Share Website
                </DropdownMenuItem>
                <DropdownMenuItem onClick={downloadBookmarks} className={!hasBookmarks ? "opacity-50" : ""}>
                  Download Bookmarks
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    if (fileInputRef.current) fileInputRef.current.click();
                  }}
                >
                  Upload Bookmarks
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowResetConfirm(true)}>
                  Reset All
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Themed reset confirmation dialog */}
            {showResetConfirm && (
              <ConfirmDialog
                isOpen={showResetConfirm}
                title="Reset Application"
                message="This will clear all bookmarks and return the app to a fresh state. Are you sure?"
                confirmText="Reset"
                cancelText="Cancel"
                onCancel={() => setShowResetConfirm(false)}
                onConfirm={() => {

                  // Reset UI state
                  setBookmarks([]);
                  setBackgroundImage("");
                  setSelectedItem(null);
                  setDialogOpen(false);
                  setWatchFilter("all");
                  setShareToast(false);
                  setSortType("time_desc");
                  setSelectionMode(false);
                  setSelectedKeys([]);
                  setShowFranchiseDialog(false);
                  setFranchiseName("");
                  setFranchiseFilter("");
                  setMissingRatings([]);

                  setShowResetConfirm(false);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              />
            )}
          </div>

          {/* Search Bar */}
          <div className={`mb-12 ${!hasBookmarks ? "" : "mt-8"}`}>
            <SearchBar onAddBookmark={handleAddBookmark} isVisible={true} bookmarks={bookmarks} />
          </div>

          {/* Timer - Only shown when there are bookmarks */}
          {hasBookmarks && (
            <div className="text-center mb-12">
              <Timer bookmarks={bookmarks} watchFilter={watchFilter} typeFilter={typeFilter} />
            </div>
          )}

          {/* Franchise Builder Controls */}
          {hasBookmarks && (
            <div className="mb-6 px-4 flex items-center gap-2 sm:gap-3 justify-center flex-wrap">
              {!selectionMode ? (
                <button
                  onClick={() => {
                    setSelectionMode(true);
                    setSelectedKeys([]);
                  }}
                  className="px-4 py-2 rounded-md bg-card border border-border text-foreground hover:bg-card/80 transition-colors"
                >
                  Select Movies
                </button>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setSelectionMode(false);
                      setSelectedKeys([]);
                    }}
                    className="px-4 py-2 rounded-md bg-card border border-border text-foreground hover:bg-card/80 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setSelectedKeys([])}
                    className="px-4 py-2 rounded-md bg-card border border-border text-foreground hover:bg-card/80 transition-colors"
                  >
                    Clear Selection
                  </button>
                  <button
                    disabled={selectedKeys.length < 1}
                    onClick={() => setShowFranchiseDialog(true)}
                    className="px-4 py-2 rounded-md bg-primary text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                    title={selectedKeys.length < 1 ? "Select at least 1 movie" : "Create or add to franchise"}
                  >
                    Group as Franchise
                  </button>
                </>
              )}
            </div>
          )}

          {/* Bookmarks Grid - Center-aligned */}
          {hasBookmarks ? (
            <div className="flex justify-center">
              <div className="max-w-7xl w-full">
                <BookmarksGrid
                  bookmarks={filteredBookmarks}
                  sortType={sortType}
                  onRemoveBookmark={handleRemoveBookmark}
                  onCardClick={handleCardClick}
                  onToggleWatchStatus={handleToggleWatchStatus}
                  onUpdateBookmark={updateBookmark}
                  selectionMode={selectionMode}
                  selectedKeys={selectedKeys}
                  onToggleSelect={(item) => {
                    if (item.type !== "movie") return;
                    const key = `${item.type}-${item.id}`;
                    setSelectedKeys((prev) =>
                      prev.includes(key)
                        ? prev.filter((k) => k !== key)
                        : [...prev, key]
                    );
                  }}
                />
              </div>
            </div>
          ) : null}

          {/* Missing ratings panel */}
          {missingRatings && missingRatings.length > 0 && (
            <div className="fixed left-4 bottom-4 z-50 w-80 bg-card/95 border border-border rounded-lg p-3 shadow-2xl">
              <div className="flex justify-between items-center mb-2">
                <div className="font-semibold">Missing IMDb Ratings</div>
                <button onClick={() => setMissingRatings([])} className="text-sm text-muted-foreground">Close</button>
              </div>
              <div className="text-sm max-h-48 overflow-auto mb-2">
                {missingRatings.map((m) => (
                  <div key={`${m.type}-${m.id}`} className="py-1">{m.title} <span className="text-muted-foreground">({m.type})</span></div>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    setFetchingRatings(true);
                    try {
                      const updated = [...bookmarks];
                      for (const m of missingRatings) {
                        const idx = updated.findIndex((b) => b.id === m.id && b.type === m.type);
                        if (idx === -1) continue;
                        try {
                          if (m.type === "movie") {
                            const details = await getMovieDetails(m.id).catch(() => null);
                            const imdbId = details?.external_ids?.imdb_id;
                            const year = details?.release_date ? new Date(details.release_date).getFullYear().toString() : undefined;
                            const omdbRating = await getIMDbRating({ imdbId, title: details?.title || m.title, year });
                            if (omdbRating && omdbRating !== "N/A") {
                              updated[idx] = { ...updated[idx], imdbRating: omdbRating };
                            }
                          } else {
                            const details = await getTVDetails(m.id).catch(() => null);
                            const imdbId = details?.external_ids?.imdb_id;
                            const year = details?.first_air_date ? new Date(details.first_air_date).getFullYear().toString() : undefined;
                            const omdbRating = await getIMDbRating({ imdbId, title: details?.name || m.title, year });
                            if (omdbRating && omdbRating !== "N/A") {
                              updated[idx] = { ...updated[idx], imdbRating: omdbRating };
                            }
                          }
                        } catch (err) {
                          // ignore per-item errors
                        }
                      }
                      setBookmarks(updated);
                      const missing = updated.filter((b) => !b.imdbRating || b.imdbRating === "N/A").map((b) => ({ id: b.id, title: b.title, type: b.type }));
                      setMissingRatings(missing);
                    } finally {
                      setFetchingRatings(false);
                    }
                  }}
                  className="px-3 py-1 rounded-md bg-primary text-primary-foreground disabled:opacity-50"
                >
                  {fetchingRatings ? "Fetching..." : "Fetch Now"}
                </button>

                <button onClick={() => { setMissingRatings([]); }} className="px-3 py-1 rounded-md bg-card border border-border">Dismiss</button>
              </div>
            </div>
          )}

          {/* Dialog Box */}
          <DialogBox
            item={selectedItem}
            isOpen={dialogOpen}
            onClose={() => setDialogOpen(false)}
            onRemove={handleRemoveBookmark}
            onToggleWatchStatus={handleToggleWatchStatus}
            franchiseMovies={
              selectedItem?.franchise
                ? bookmarks.filter(
                    (b) => b.franchise === selectedItem.franchise,
                  )
                : undefined
            }
          />
        </div>
      </div>

      {/* Share Toast Notification */}
      {shareToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-card/95 backdrop-blur-md border border-border/50 rounded-xl p-4 shadow-2xl animate-in slide-in-from-bottom-2">
          <div className="flex items-center gap-2 text-sm text-foreground">
            <div className="w-2 h-2 rounded-full bg-primary"></div>
            <span>URL copied to clipboard!</span>
          </div>
        </div>
      )}

      {/* Franchise Name Dialog */}
      {showFranchiseDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowFranchiseDialog(false)} />
          <div className="relative w-full max-w-2xl bg-card/95 backdrop-blur-md border border-border/50 rounded-2xl p-6 shadow-2xl">
            <input
              value={franchiseFilter}
              onChange={(e) => setFranchiseFilter(e.target.value)}
              placeholder="Search or add franchise..."
              className="w-full mb-3 px-3 py-2 rounded-md bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus
            />

            <div className="max-h-72 overflow-y-auto rounded-md border border-border/40 p-2 bg-background/60">
              {franchiseFilter.trim().length >= 2 ? (
                franchiseCounts.filter(({ name }) => name.toLowerCase().includes(franchiseFilter.trim().toLowerCase())).length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {franchiseCounts
                      .filter(({ name }) => name.toLowerCase().includes(franchiseFilter.trim().toLowerCase()))
                      .map(({ name }) => (
                        <button
                          key={name}
                          onClick={() => {
                            const selectedName = name;
                            // apply franchise to selected movies
                            setBookmarks((prev) =>
                              prev.map((it) => {
                                const key = `${it.type}-${it.id}`;
                                if (it.type === "movie" && selectedKeys.includes(key)) {
                                  return { ...it, franchise: selectedName };
                                }
                                return it;
                              })
                            );
                            setFranchiseFilter("");
                            setSelectedKeys([]);
                            setSelectionMode(false);
                            setShowFranchiseDialog(false);
                          }}
                          className="w-full text-left px-3 py-2 rounded-md bg-card/60 border border-border text-foreground hover:bg-card"
                          title={name}
                        >
                          {name}
                        </button>
                      ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">No franchises found.</div>
                )
              ) : (
                <div className="text-sm text-muted-foreground">Type at least 2 characters to search</div>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-3">
              <button
                onClick={() => setShowFranchiseDialog(false)}
                className="px-4 py-2 rounded-md bg-card border border-border text-foreground hover:bg-card/80 transition-colors"
              >
                Cancel
              </button>

              {franchiseFilter.trim().length >= 2 && (
                <button
                  onClick={() => {
                    const name = franchiseFilter.trim();
                    setBookmarks((prev) =>
                      prev.map((it) => {
                        const key = `${it.type}-${it.id}`;
                        if (it.type === "movie" && selectedKeys.includes(key)) {
                          return { ...it, franchise: name };
                        }
                        return it;
                      })
                    );
                    setFranchiseFilter("");
                    setSelectedKeys([]);
                    setSelectionMode(false);
                    setShowFranchiseDialog(false);
                  }}
                  className="px-4 py-2 rounded-md bg-primary text-primary-foreground"
                >
                  Add "{franchiseFilter.trim()}"
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      <ScrollToTop />
    </div>
  );
}
