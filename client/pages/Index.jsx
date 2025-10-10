import { useState, useEffect, useMemo, useRef } from "react";
import { MoreHorizontal, Filter, Eye, EyeOff, ArrowUpDown, RefreshCw, Tv, Play } from "lucide-react";
import { motion } from "framer-motion";
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
import { loadBookmarks, storeBookmarks } from "../lib/persist";
import ConfirmDialog from "../components/ConfirmDialog";

export default function Index() {
  const [bookmarks, setBookmarks] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [backgroundImage, setBackgroundImage] = useState("");
  const [watchFilter, setWatchFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [shareToast, setShareToast] = useState(false);
  const [sortType, setSortType] = useState("time_desc");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [showFranchiseDialog, setShowFranchiseDialog] = useState(false);
  const [franchiseName, setFranchiseName] = useState("");
  const [franchiseFilter, setFranchiseFilter] = useState("");

  const [missingRatings, setMissingRatings] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [fetchingRatings, setFetchingRatings] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const UI_STATE_KEY = "onlyseries-ui-v1";
  const fileInputRef = useRef(null);

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

  useEffect(() => {
    try {
      const toSave = { watchFilter, typeFilter, sortType, selectionMode };
      localStorage.setItem(UI_STATE_KEY, JSON.stringify(toSave));
    } catch (e) {}
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

  useEffect(() => {
    (async () => {
      try {
        const saved = await loadBookmarks();
        const migratedFlag = localStorage.getItem("onlyseries-franchise-migrated-v1");
        if (saved && Array.isArray(saved)) {
          const parsed = saved;
          if (!migratedFlag) {
            const cleared = parsed.map((it, i) => ({
              ...it,
              franchise: undefined,
              addedAt: it.addedAt ?? (Date.now() - (parsed.length - i)),
            }));
            setBookmarks(cleared);
            localStorage.setItem("onlyseries-franchise-migrated-v1", "true");
            if (cleared.length > 0) setBackgroundImage(cleared[cleared.length - 1].poster);
          } else {
            const withAdded = parsed.map((it, i) => ({
              ...it,
              addedAt: it.addedAt ?? (Date.now() - (parsed.length - i)),
            }));
            setBookmarks(withAdded);
            if (withAdded.length > 0) setBackgroundImage(withAdded[withAdded.length - 1].poster);
          }
        }
      } catch (e) {
        console.warn("Failed to load bookmarks", e);
      }
    })();
  }, []);

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

  useEffect(() => {
    const anyOpen = dialogOpen || showFranchiseDialog || showResetConfirm;
    if (typeof document === 'undefined') return;
    if (anyOpen) {
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

  useEffect(() => {
    (async () => {
      try { await storeBookmarks(bookmarks); } catch {}
    })();
    if (bookmarks.length > 0) setBackgroundImage(bookmarks[bookmarks.length - 1].poster); else setBackgroundImage("");
  }, [bookmarks]);

  useEffect(() => {
    let cancelled = false;
    const needsEnrichment = bookmarks.some((b) => {
      if (b.type === "movie") return (!b.runtime || b.runtime <= 0) || (!b.imdbRating || b.imdbRating === "N/A");
      if (b.type === "tv") return (!Number.isFinite(b.episodes) || !Number.isFinite(b.averageEpisodeRuntime)) || (!b.imdbRating || b.imdbRating === "N/A");
      return false;
    });
    if (!needsEnrichment) return;
    const enrich = async () => {
      try {
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
                    if (omdbRating && omdbRating !== "N/A") imdbRating = omdbRating; else {
                      const tmdbRating = typeof details?.vote_average === 'number' ? String(details.vote_average.toFixed(1)) : undefined;
                      imdbRating = tmdbRating || (b.imdbRating || "N/A");
                    }
                  } catch {
                    const tmdbRating = typeof details?.vote_average === 'number' ? String(details.vote_average.toFixed(1)) : undefined;
                    imdbRating = tmdbRating || (b.imdbRating || "N/A");
                  }
                }
                results[i] = { ...b, runtime, imdbRating };
                continue;
              }
              if (b.type === "tv") {
                const details = await getTVDetails(b.id).catch(() => null);
                let numEpisodes = Number.isFinite(details?.number_of_episodes) ? details.number_of_episodes : null;
                if (!Number.isFinite(numEpisodes)) {
                  if (Array.isArray(details?.seasons) && details.seasons.length > 0) {
                    const sum = details.seasons.reduce((s, ss) => s + (Number.isFinite(ss?.episode_count) ? ss.episode_count : 0), 0);
                    if (sum > 0) numEpisodes = sum;
                  }
                }
                if (!Number.isFinite(numEpisodes)) {
                  if (Number.isFinite(b.episodes)) numEpisodes = b.episodes; else if (Number.isFinite(details?.number_of_seasons)) numEpisodes = (details.number_of_seasons || 1) * 10; else numEpisodes = (b.seasons || 1) * 10;
                }
                let avgRuntime = undefined;
                if (Array.isArray(details?.episode_run_time) && details.episode_run_time.length > 0) {
                  const runs = details.episode_run_time.filter(Number.isFinite);
                  if (runs.length > 0) avgRuntime = Math.round(runs.reduce((a,c)=>a+c,0)/runs.length);
                } else if (Number.isFinite(details?.episode_run_time)) {
                  avgRuntime = details.episode_run_time;
                }
                if (!Number.isFinite(avgRuntime) && Number.isFinite(b.averageEpisodeRuntime)) avgRuntime = b.averageEpisodeRuntime;
                const epRunArr = Array.isArray(details?.episode_run_time) ? details.episode_run_time : (Array.isArray(b.episode_run_time) ? b.episode_run_time : []);
                let imdbRating = b.imdbRating;
                if (!imdbRating || imdbRating === "N/A") {
                  try {
                    const imdbId = details?.external_ids?.imdb_id;
                    const year = details?.first_air_date ? String(new Date(details.first_air_date).getFullYear()) : b.year;
                    const omdbRating = await getIMDbRating({ imdbId, title: details?.name || b.title, year });
                    if (omdbRating && omdbRating !== "N/A") imdbRating = omdbRating;
                  } catch {}
                }
                const tmdbRating = typeof details?.vote_average === 'number' ? String(details.vote_average.toFixed(1)) : undefined;
                const totalMinutes = Number.isFinite(numEpisodes) && Number.isFinite(avgRuntime) ? (numEpisodes * avgRuntime) : null;
                results[i] = { ...b, episodes: numEpisodes, averageEpisodeRuntime: avgRuntime, episode_run_time: epRunArr, totalRuntimeMinutes, imdbRating: (!imdbRating || imdbRating === "N/A") ? (tmdbRating || b.imdbRating || "N/A") : imdbRating };
                continue;
              }
              results[i] = b;
            } catch { results[i] = b; }
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
    return () => { cancelled = true; };
  }, [bookmarks]);

  const handleAddBookmark = (item) => {
    const exists = bookmarks.some((bookmark) => bookmark.id === item.id && bookmark.type === item.type);
    if (!exists) {
      setBookmarks((prev) => {
        const newItem = { ...item, franchise: undefined, watchStatus: "unwatched", addedAt: Date.now() };
        return [...prev, newItem];
      });
    }
  };

  const handleRemoveBookmark = (id, type) => {
    setBookmarks((prev) => prev.filter((item) => !(item.id === id && item.type === type)));
  };

  const updateBookmark = (id, type, patch) => {
    setBookmarks((prev) => prev.map((b) => (b.id === id && b.type === type ? { ...b, ...patch } : b)));
  };

  const handleToggleWatchStatus = (id, type) => {
    setBookmarks((prev) => prev.map((item) => (item.id === id && item.type === type ? { ...item, watchStatus: item.watchStatus === "watched" ? "unwatched" : "watched" } : item)));
  };

  const handleCardClick = (item) => { setSelectedItem(item); setDialogOpen(true); };

  const handleRenameFranchise = (oldName, newName) => {
    const from = String(oldName || "").trim();
    const to = String(newName || "").trim();
    if (!from || !to || from === to) return;
    setBookmarks((prev) => prev.map((it) => (it.type === "movie" && String(it.franchise || "") === from ? { ...it, franchise: to } : it)));
    setSelectedItem((prev) => (prev && String(prev.franchise || "") === from ? { ...prev, franchise: to } : prev));
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
            const valid = (it) => it && typeof it === 'object' && (it.type === 'movie' || it.type === 'tv') && Number.isFinite(Number(it.id)) && typeof (it.title || it.name) === 'string';
            const normalized = uploaded
              .filter(valid)
              .map((raw, i) => {
                const it = { ...raw };
                const type = it.type === 'tv' ? 'tv' : 'movie';
                const title = it.title || it.name || '';
                const poster = it.poster || it.poster_path || null;
                const common = {
                  id: Number(it.id),
                  type,
                  title,
                  year: String(it.year || it.release_year || it.first_air_year || it.release_date ? new Date(it.release_date || it.first_air_date || `${it.year || ''}-01-01`).getFullYear() : '') || '',
                  poster,
                  imdbRating: typeof it.imdbRating === 'string' ? it.imdbRating : (typeof it.vote_average === 'number' ? String(it.vote_average.toFixed(1)) : 'N/A'),
                  watchStatus: it.watchStatus === 'watched' ? 'watched' : 'unwatched',
                  franchise: typeof it.franchise === 'string' && it.franchise.trim() ? it.franchise.trim() : undefined,
                  addedAt: typeof it.addedAt === 'number' && Number.isFinite(it.addedAt) ? it.addedAt : (base + i),
                };
                if (type === 'movie') {
                  return { ...common, runtime: Number.isFinite(Number(it.runtime)) ? Number(it.runtime) : 120 };
                }
                return {
                  ...common,
                  seasons: Number.isFinite(Number(it.seasons)) ? Number(it.seasons) : (Number.isFinite(Number(it.number_of_seasons)) ? Number(it.number_of_seasons) : 1),
                  episodes: Number.isFinite(Number(it.episodes)) ? Number(it.episodes) : (Number.isFinite(Number(it.number_of_episodes)) ? Number(it.number_of_episodes) : 10),
                  averageEpisodeRuntime: Number.isFinite(Number(it.averageEpisodeRuntime)) ? Number(it.averageEpisodeRuntime) : (Number.isFinite(Number(it.episode_run_time)) ? Number(it.episode_run_time) : undefined),
                  episode_run_time: Array.isArray(it.episode_run_time) ? it.episode_run_time : [],
                };
              });
            setBookmarks(normalized);
            setDialogOpen(false);
            setShowFranchiseDialog(false);
            setSelectionMode(false);
            setSelectedKeys([]);
            try {
              const prev = document.body.dataset._prevOverflow || '';
              document.body.style.overflow = prev;
              delete document.body.dataset._prevOverflow;
            } catch {}
            try { window.dispatchEvent(new CustomEvent('close-search-results')); } catch {}
            try { window.dispatchEvent(new CustomEvent('app:reset-ui')); } catch {}
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

  const filteredBookmarks = bookmarks.filter(item => {
    if (watchFilter === "watched" && item.watchStatus !== "watched") return false;
    if (watchFilter === "unwatched" && item.watchStatus === "watched") return false;
    if (typeFilter && typeFilter !== "all" && item.type !== typeFilter) return false;
    return true;
  });

  const hasBookmarks = bookmarks.length > 0;

  return (
    <div className="min-h-screen relative overflow-hidden">
      <OfflineBanner />

      {backgroundImage && (
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20"
          style={{ backgroundImage: `url(${backgroundImage})`, filter: "blur(10px)" }}
        />
      )}

      <div className="relative z-10 min-h-screen/90">
        <div className="container mx-auto px-4 py-8">
          {!hasBookmarks && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.25,0.1,0.25,1] }}
              className="text-center mb-16 mt-20"
            >
              <h1 className="text-5xl md:text-7xl font-bold mb-4 text-[hsl(var(--primary))] leading-tight">
                only<span className="text-[hsl(var(--accent))]">series</span>.towatch
              </h1>
              <p className="text-xl md:text-2xl text-foreground/70">
                Track, Bookmark & Watch Smarter
              </p>
            </motion.div>
          )}

          <div className="fixed top-4 left-1/2 -translate-x-1/2 md:top-6 md:right-6 md:left-auto md:translate-x-0 z-50 flex gap-2 justify-center">
            <input ref={fileInputRef} type="file" accept=".json" onChange={uploadBookmarks} className="hidden" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <motion.button
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.98 }}
                  className={`btn-tertiary p-2 md:p-3 relative`}
                  title="Filter watchlist"
                >
                  <Filter className="w-4 h-4 md:w-5 md:h-5" />
                  {watchFilter !== "all" && (
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-[hsl(var(--accent))]"></div>
                  )}
                </motion.button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40 glass-panel">
                <DropdownMenuItem onClick={() => setWatchFilter("all")} className={watchFilter === "all" ? "bg-[hsla(var(--gold)/0.2)]" : ""}>
                  <Filter className="w-4 h-4" />
                  All Items
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setWatchFilter("unwatched")} className={watchFilter === "unwatched" ? "bg-[hsla(var(--gold)/0.2)]" : ""}>
                  <Eye className="w-4 h-4" />
                  Will Watch
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setWatchFilter("watched")} className={watchFilter === "watched" ? "bg-[hsla(var(--gold)/0.2)]" : ""}>
                  <EyeOff className="w-4 h-4" />
                  Watched
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <motion.button whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.98 }} className={`btn-tertiary p-2 md:p-3 relative`} title="Filter type">
                  <Tv className="w-4 h-4 md:w-5 md:h-5" />
                  {typeFilter !== "all" && <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-[hsl(var(--accent))]"></div>}
                </motion.button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40 glass-panel">
                <DropdownMenuItem onClick={() => setTypeFilter("all")} className={typeFilter === "all" ? "bg-[hsla(var(--gold)/0.2)]" : ""}>All</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTypeFilter("movie")} className={typeFilter === "movie" ? "bg-[hsla(var(--gold)/0.2)]" : ""}>Movies</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTypeFilter("tv")} className={typeFilter === "tv" ? "bg-[hsla(var(--gold)/0.2)]" : ""}>Series</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <motion.button whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.98 }} className="btn-tertiary p-2 md:p-3" title="Sort">
                  <ArrowUpDown className="w-4 h-4 md:w-5 md:h-5" />
                </motion.button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 glass-panel">
                <DropdownMenuItem onClick={() => setSortType("alpha_asc")} className={sortType === "alpha_asc" ? "bg-[hsla(var(--gold)/0.2)]" : ""}>A → Z (Title)</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortType("alpha_desc")} className={sortType === "alpha_desc" ? "bg-[hsla(var(--gold)/0.2)]" : ""}>Z → A (Title)</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortType("time_asc")} className={sortType === "time_asc" ? "bg-[hsla(var(--gold)/0.2)]" : ""}>Time added: First → Last</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortType("time_desc")} className={sortType === "time_desc" ? "bg-[hsla(var(--gold)/0.2)]" : ""}>Time added: Last → First</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <motion.button whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.98 }} className="btn-tertiary p-2 md:p-3" title="More">
                  <MoreHorizontal className="w-4 h-4 md:w-5 md:h-5" />
                </motion.button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 glass-panel">
                <DropdownMenuItem onClick={async () => {
                  try {
                    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
                      await navigator.clipboard.writeText(window.location.href);
                    } else {
                      const tmp = document.createElement('input'); tmp.value = window.location.href; document.body.appendChild(tmp); tmp.select(); document.execCommand('copy'); document.body.removeChild(tmp);
                    }
                    setShareToast(true); setTimeout(() => setShareToast(false), 3000);
                  } catch (e) { try { window.prompt('Copy URL', window.location.href); } catch {} }
                }}>Share Website</DropdownMenuItem>
                <DropdownMenuItem onClick={downloadBookmarks} className={!hasBookmarks ? "opacity-50" : ""}>Download Bookmarks</DropdownMenuItem>
                <DropdownMenuItem onSelect={(e) => { e.preventDefault(); if (fileInputRef.current) fileInputRef.current.click(); }}>Upload Bookmarks</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowResetConfirm(true)}>Reset All</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {showResetConfirm && (
              <ConfirmDialog
                isOpen={showResetConfirm}
                title="Reset Application"
                message="This will clear all bookmarks and return the app to a fresh state. Are you sure?"
                confirmText="Reset"
                cancelText="Cancel"
                onCancel={() => setShowResetConfirm(false)}
                onConfirm={() => {
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

          <div className={`mb-12 ${!hasBookmarks ? "" : "mt-8"}`}>
            <SearchBar
              onAddBookmark={handleAddBookmark}
              isVisible={true}
              bookmarks={bookmarks}
              onBulkFranchise={(movies) => {
                try {
                  const keys = Array.isArray(movies) ? movies.map((m) => `${m.type}-${m.id}`) : [];
                  if (keys.length === 0) return;
                  setSelectionMode(true);
                  setSelectedKeys(keys);
                  setShowFranchiseDialog(true);
                  setFranchiseFilter("");
                } catch (e) {}
              }}
            />
          </div>

          {hasBookmarks && (
            <div className="text-center mb-12">
              <Timer bookmarks={bookmarks} watchFilter={watchFilter} typeFilter={typeFilter} />
            </div>
          )}

          {hasBookmarks && (
            <div className="mb-6 px-4 flex items-center gap-2 sm:gap-3 justify-center flex-wrap">
              {!selectionMode ? (
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }} onClick={() => { setSelectionMode(true); setSelectedKeys([]); }} className="btn-tertiary px-4 py-2">
                  Select Movies
                </motion.button>
              ) : (
                <>
                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }} onClick={() => { setSelectionMode(false); setSelectedKeys([]); }} className="btn-tertiary px-4 py-2">Cancel</motion.button>
                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }} onClick={() => setSelectedKeys([])} className="btn-tertiary px-4 py-2">Clear Selection</motion.button>
                  <motion.button disabled={selectedKeys.length < 1} whileHover={{ scale: selectedKeys.length < 1 ? 1 : 1.03 }} whileTap={{ scale: selectedKeys.length < 1 ? 1 : 0.98 }} onClick={() => setShowFranchiseDialog(true)} className="btn-primary px-4 py-2" title={selectedKeys.length < 1 ? "Select at least 1 movie" : "Create or add to franchise"}>
                    Group as Franchise
                  </motion.button>
                </>
              )}
            </div>
          )}

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
                    setSelectedKeys((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);
                  }}
                />
              </div>
            </div>
          ) : null}

          {missingRatings && missingRatings.length > 0 && (
            <div className="fixed left-4 bottom-4 z-50 glass-panel w-80">
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
                <button onClick={async () => { setFetchingRatings(true); try { const updated = [...bookmarks]; for (const m of missingRatings) { const idx = updated.findIndex((b) => b.id === m.id && b.type === m.type); if (idx === -1) continue; try { if (m.type === "movie") { const details = await getMovieDetails(m.id).catch(() => null); const imdbId = details?.external_ids?.imdb_id; const year = details?.release_date ? new Date(details.release_date).getFullYear().toString() : undefined; const omdbRating = await getIMDbRating({ imdbId, title: details?.title || m.title, year }); if (omdbRating && omdbRating !== "N/A") updated[idx] = { ...updated[idx], imdbRating: omdbRating }; } else { const details = await getTVDetails(m.id).catch(() => null); const imdbId = details?.external_ids?.imdb_id; const year = details?.first_air_date ? new Date(details.first_air_date).getFullYear().toString() : undefined; const omdbRating = await getIMDbRating({ imdbId, title: details?.name || m.title, year }); if (omdbRating && omdbRating !== "N/A") updated[idx] = { ...updated[idx], imdbRating: omdbRating }; } } catch {} } setBookmarks(updated); const missing = updated.filter((b) => !b.imdbRating || b.imdbRating === "N/A").map((b) => ({ id: b.id, title: b.title, type: b.type })); setMissingRatings(missing); } finally { setFetchingRatings(false); } }} className="btn-primary px-3 py-1 disabled:opacity-50">{fetchingRatings ? "Fetching..." : "Fetch Now"}</button>
                <button onClick={() => { setMissingRatings([]); }} className="btn-tertiary px-3 py-1">Dismiss</button>
              </div>
            </div>
          )}

          <DialogBox
            item={selectedItem}
            isOpen={dialogOpen}
            onClose={() => setDialogOpen(false)}
            onRemove={handleRemoveBookmark}
            onToggleWatchStatus={handleToggleWatchStatus}
            franchiseMovies={selectedItem?.franchise ? bookmarks.filter((b) => b.franchise === selectedItem.franchise) : undefined}
            onRenameFranchise={handleRenameFranchise}
            onUpdateBookmark={updateBookmark}
          />
        </div>
      </div>

      {shareToast && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="fixed bottom-6 right-6 z-50 glass-panel">
          <div className="flex items-center gap-2 text-sm text-foreground">
            <div className="w-2 h-2 rounded-full bg-[hsl(var(--mint))]"></div>
            <span>URL copied to clipboard!</span>
          </div>
        </motion.div>
      )}

      {showFranchiseDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowFranchiseDialog(false)} />
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="relative w-full max-w-2xl glass-panel">
            <input value={franchiseFilter} onChange={(e) => setFranchiseFilter(e.target.value)} placeholder="Search or add franchise..." className="glass-input mb-3" autoFocus />
            <div className="max-h-72 overflow-y-auto rounded-md p-2 bg-background/40 border border-border/40">
              {franchiseFilter.trim().length >= 2 ? (
                franchiseCounts.filter(({ name }) => name.toLowerCase().includes(franchiseFilter.trim().toLowerCase())).length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {franchiseCounts.filter(({ name }) => name.toLowerCase().includes(franchiseFilter.trim().toLowerCase())).map(({ name }) => (
                      <button key={name} onClick={() => { const selectedName = name; setBookmarks((prev) => prev.map((it) => { const key = `${it.type}-${it.id}`; if (it.type === "movie" && selectedKeys.includes(key)) { return { ...it, franchise: selectedName }; } return it; })); setFranchiseFilter(""); setSelectedKeys([]); setSelectionMode(false); setShowFranchiseDialog(false); }} className="w-full text-left px-3 py-2 rounded-md bg-background/40 border border-border/60 hover:bg-background/60" title={name}>
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
              <button onClick={() => setShowFranchiseDialog(false)} className="btn-tertiary px-4 py-2">Cancel</button>
              {franchiseFilter.trim().length >= 2 && (
                <button onClick={() => { const name = franchiseFilter.trim(); setBookmarks((prev) => prev.map((it) => { const key = `${it.type}-${it.id}`; if (it.type === "movie" && selectedKeys.includes(key)) { return { ...it, franchise: name }; } return it; })); setFranchiseFilter(""); setSelectedKeys([]); setSelectionMode(false); setShowFranchiseDialog(false); }} className="btn-primary px-4 py-2">Add "{franchiseFilter.trim()}"</button>
              )}
            </div>
          </motion.div>
        </div>
      )}
      <ScrollToTop />
    </div>
  );
}
