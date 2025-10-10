import React, { useEffect, useState } from "react";
import { X, Clock, Star, Film, Tv, Calendar, Eye, Check, EyeOff, Pencil } from "lucide-react";
import { motion } from "framer-motion";
import { useIsMobile } from "../hooks/use-mobile";
import { getMovieDetails, getIMDbRating } from "../lib/api";

function FranchiseMovieCard({ movie, onRemove, onUpdateBookmark, formatWatchTime }) {
  const [localRating, setLocalRating] = useState(movie.imdbRating || "N/A");
  const [localRuntime, setLocalRuntime] = useState(movie.runtime || 120);

  useEffect(() => {
    let cancelled = false;
    const enrich = async () => {
      try {
        const details = await getMovieDetails(movie.id).catch(() => null);
        const runtime = Number.isFinite(details?.runtime) ? details.runtime : (Number.isFinite(movie.runtime) ? movie.runtime : 120);
        let imdbRating = movie.imdbRating;
        try {
          const imdbId = details?.external_ids?.imdb_id;
          const year = details?.release_date ? String(new Date(details.release_date).getFullYear()) : movie.year;
          const omdbRating = await getIMDbRating({ imdbId, title: details?.title || movie.title, year }).catch(() => 'N/A');
          if (omdbRating && omdbRating !== 'N/A') imdbRating = omdbRating; else { const tmdbRating = typeof details?.vote_average === 'number' ? String(details.vote_average.toFixed(1)) : undefined; imdbRating = tmdbRating || (movie.imdbRating || 'N/A'); }
        } catch { const tmdbRating = typeof details?.vote_average === 'number' ? String(details.vote_average.toFixed(1)) : undefined; imdbRating = tmdbRating || (movie.imdbRating || 'N/A'); }
        if (!cancelled) {
          setLocalRuntime(runtime); setLocalRating(imdbRating);
          if (typeof onUpdateBookmark === 'function') onUpdateBookmark(movie.id, 'movie', { runtime, imdbRating });
        }
      } catch {}
    };
    enrich();
    return () => { cancelled = true; };
  }, [movie.id]);

  return (
    <div className="group relative">
      <div className="aspect-[2/3] rounded-xl overflow-hidden glass-card">
        <img src={movie.poster} alt={movie.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
          {onRemove && (
            <button onClick={(e) => { e.stopPropagation(); onRemove(movie.id, movie.type); }} className="absolute top-2 right-2 bg-destructive/90 backdrop-blur-sm text-white rounded-full p-1.5 hover:bg-destructive transition-colors shadow-lg">
              <X className="w-3 h-3" />
            </button>
          )}
          <div className="absolute bottom-0 left-0 right-0 p-3 space-y-2">
            <div className="text-white text-sm font-medium">{movie.title}</div>
            <div className="flex items-center gap-2 text-xs text-white/90"><Star className="w-3 h-3" /><span>{localRating}</span></div>
            <div className="flex items-center gap-2 text-xs text-white/90"><Clock className="w-3 h-3" /><span>{formatWatchTime(localRuntime || 120)}</span></div>
          </div>
        </div>
      </div>
      <div className="mt-2 text-center">
        <div className="font-medium text-sm text-foreground truncate">{movie.title}</div>
        <div className="text-xs text-foreground/70">{movie.year}</div>
      </div>
    </div>
  );
}

export default function DialogBox({ item, isOpen, onClose, onRemove, onToggleWatchStatus, franchiseMovies, onRenameFranchise, onUpdateBookmark, }) {
  const isMobile = useIsMobile();
  const [editingFranchise, setEditingFranchise] = useState(false);
  const [newFranchiseName, setNewFranchiseName] = useState("");

  useEffect(() => { if (item && item.franchise) { setNewFranchiseName(String(item.franchise)); setEditingFranchise(false); } else { setEditingFranchise(false); setNewFranchiseName(""); } }, [item]);

  const handleClose = () => { onClose(); };

  const handleSaveRename = () => {
    const from = String(item?.franchise || "").trim(); const to = String(newFranchiseName || "").trim();
    if (!from) { setEditingFranchise(false); return; }
    if (!to || to.length < 2 || to === from) { setEditingFranchise(false); setNewFranchiseName(from); return; }
    if (typeof onRenameFranchise === "function") onRenameFranchise(from, to);
    setEditingFranchise(false);
  };

  const formatWatchTime = (runtime) => { const hours = Math.floor(runtime / 60); const minutes = runtime % 60; return `${hours}h ${minutes}m`; };
  if (!isOpen || !item) return null;

  const isCompactMobileMovie = isMobile && item.type === "movie" && !item.franchise;
  const isCompactDesktopMovie = !isMobile && item.type === "movie" && !item.franchise;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={handleClose}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.25,0.1,0.25,1] }}
        className={isCompactMobileMovie ? "glass-panel w-[calc(100%-2rem)] max-w-sm max-h-[calc(100vh-2rem)] overflow-y-auto" : isCompactDesktopMovie ? "glass-panel w-[680px] max-w-[calc(100%-4rem)] max-h-[90vh] overflow-y-auto" : "glass-panel max-w-6xl max-h-[90vh] overflow-y-auto"}
        onClick={(e) => e.stopPropagation()}
      >
        {isCompactMobileMovie || isCompactDesktopMovie ? (
          <div className={isCompactMobileMovie ? "p-4" : "p-6"}>
            <div className="flex items-start justify-between mb-3">
              <h2 className={isCompactMobileMovie ? "text-base font-semibold text-foreground pr-8" : "text-xl font-semibold text-foreground pr-8 truncate"}>{item.title}</h2>
              <button onClick={handleClose} className="p-2 hover:bg-[hsla(var(--gold)/0.2)] rounded-xl transition-colors -mr-2 -mt-2" aria-label="Close"><X className={isCompactMobileMovie ? "w-5 h-5" : "w-6 h-6"} /></button>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0"><img src={item.poster} alt={item.title} className={isCompactMobileMovie ? "w-24 h-36 object-cover rounded-xl shadow-md" : "w-32 h-48 object-cover rounded-xl shadow-md"} /></div>
              <div className="flex-1 space-y-3">
                <div className={isCompactMobileMovie ? "flex items-center gap-2 text-xs text-foreground/70 whitespace-nowrap overflow-x-auto" : "flex items-center gap-3 text-sm text-foreground/70 whitespace-nowrap overflow-x-auto"}>
                  <span className="flex items-center gap-1"><Calendar className={isCompactMobileMovie ? "w-3.5 h-3.5" : "w-4 h-4"} />{item.year}</span>
                  <span className="flex items-center gap-1 capitalize"><Film className={isCompactMobileMovie ? "w-3.5 h-3.5" : "w-4 h-4"} />{item.type}</span>
                  <span className="flex items-center gap-1"><Star className={isCompactMobileMovie ? "w-3.5 h-3.5" : "w-4 h-4"} />{item.imdbRating}</span>
                </div>
                <div className={isCompactMobileMovie ? "flex items-center gap-2 text-sm text-foreground" : "flex items-center gap-2 text-base text-foreground"}><Clock className={isCompactMobileMovie ? "w-4 h-4 text-foreground/60" : "w-5 h-5 text-foreground/60"} /><span>{formatWatchTime(item.runtime || 120)}</span></div>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {onToggleWatchStatus && (
                    <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleWatchStatus(item.id, item.type); }} className={(item.watchStatus === "watched" ? "bg-[rgba(163,212,201,0.25)] text-[hsl(var(--mint))] border border-[rgba(163,212,201,0.35)] hover:bg-[rgba(163,212,201,0.35)]" : "bg-[rgba(176,201,212,0.25)] text-[hsl(var(--mist))] border border-[rgba(176,201,212,0.35)] hover:bg-[rgba(176,201,212,0.35)]") + (isCompactMobileMovie ? " px-3 py-1.5 rounded-lg text-xs font-medium transition-all" : " px-3.5 py-2 rounded-lg text-sm font-medium transition-all") } title={item.watchStatus === "watched" ? "Watched" : "Will Watch"}>
                      {item.watchStatus === "watched" ? (<span className="inline-flex items-center gap-1"><EyeOff className={isCompactMobileMovie ? "w-3.5 h-3.5" : "w-4 h-4"} /> Watched</span>) : (<span className="inline-flex items-center gap-1"><Eye className={isCompactMobileMovie ? "w-3.5 h-3.5" : "w-4 h-4"} /> Will Watch</span>)}
                    </button>
                  )}
                  {onRemove && (
                    <button onClick={() => { onRemove(item.id, item.type); handleClose(); }} className={isCompactMobileMovie ? "px-3 py-1.5 rounded-lg text-xs font-medium bg-destructive/90 hover:bg-destructive text-destructive-foreground" : "px-4 py-2 rounded-lg text-sm font-medium bg-destructive/90 hover:bg-destructive text-destructive-foreground"} title="Delete">Delete</button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="relative p-6 border-b border-[rgba(232,212,163,0.25)]">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-[hsla(var(--primary)/0.15)] rounded-xl">{item.type === "movie" ? (<Film className="w-6 h-6 text-[hsl(var(--primary))]" />) : (<Tv className="w-6 h-6 text-[hsl(var(--primary))]" />)}</div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {editingFranchise && item.franchise ? (
                        <>
                          <input value={newFranchiseName} onChange={(e) => setNewFranchiseName(e.target.value)} className="px-2 py-1 rounded-md bg-background border border-[rgba(232,212,163,0.5)] text-foreground text-base sm:text-lg" placeholder="Franchise name" autoFocus />
                          <button onClick={handleSaveRename} className="p-1.5 rounded-md bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:brightness-105" title="Save"><Check className="w-4 h-4" /></button>
                          <button onClick={() => { setEditingFranchise(false); setNewFranchiseName(String(item.franchise || "")); }} className="p-1.5 rounded-md bg-background border border-[rgba(232,212,163,0.5)] hover:bg-background/60" title="Cancel"><X className="w-4 h-4" /></button>
                        </>
                      ) : (
                        <>
                          <h2 className="text-2xl font-bold text-foreground">{item.franchise || item.title}</h2>
                          {item.franchise ? (<button onClick={() => setEditingFranchise(true)} className="p-1.5 rounded-md hover:bg-[hsla(var(--gold)/0.2)]" title="Rename franchise"><Pencil className="w-4 h-4" /></button>) : null}
                        </>
                      )}
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-foreground/70 whitespace-nowrap overflow-x-auto">
                        <span className="flex items-center gap-1 text-xs sm:text-sm"><Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />{item.year}</span>
                        <span className="capitalize text-xs sm:text-sm">{item.franchise ? `${franchiseMovies?.length || 0} movies` : item.type}</span>
                        {item.franchise && franchiseMovies ? (
                          <span className="flex items-center gap-1 text-[hsl(var(--primary))] text-xs sm:text-sm"><Star className="w-3.5 h-3.5 sm:w-4 sm:h-4" />{(() => { const validRatings = franchiseMovies.map((movie) => parseFloat(movie.imdbRating)).filter((rating) => !isNaN(rating) && rating > 0); if (validRatings.length === 0) return "N/A"; const average = validRatings.reduce((sum, rating) => sum + rating, 0) / validRatings.length; return average.toFixed(1); })()}</span>
                        ) : item.imdbRating !== "N/A" ? (
                          <span className="flex items-center gap-1 text-[hsl(var(--primary))]"><Star className="w-4 h-4" />{item.imdbRating}</span>
                        ) : null}
                      </div>
                      {onToggleWatchStatus && (() => {
                        const isFranchiseView = !!(item.franchise && Array.isArray(franchiseMovies) && franchiseMovies.length > 0);
                        const allWatched = isFranchiseView ? franchiseMovies.every((m) => m.watchStatus === "watched") : item.watchStatus === "watched";
                        const btnClasses = allWatched ? "bg-[rgba(163,212,201,0.25)] text-[hsl(var(--mint))] border border-[rgba(163,212,201,0.35)] hover:bg-[rgba(163,212,201,0.35)]" : "bg-[rgba(176,201,212,0.25)] text-[hsl(var(--mist))] border border-[rgba(176,201,212,0.35)] hover:bg-[rgba(176,201,212,0.35)]";
                        const handleToggle = (e) => { e.preventDefault(); e.stopPropagation(); if (isFranchiseView) { if (allWatched) { franchiseMovies.forEach((m) => { if (m.watchStatus === "watched") onToggleWatchStatus(m.id, m.type); }); } else { franchiseMovies.forEach((m) => { if (m.watchStatus !== "watched") onToggleWatchStatus(m.id, m.type); }); } } else { onToggleWatchStatus(item.id, item.type); } };
                        return (<button onClick={handleToggle} className={`p-2 rounded-lg transition-all ${btnClasses}`} title={allWatched ? "Watched" : "Will Watch"}>{allWatched ? (<EyeOff className="w-5 h-5" />) : (<Eye className="w-5 h-5" />)}</button>);
                      })()}
                    </div>
                  </div>
                </div>
                <button onClick={handleClose} className="p-2 hover:bg-[hsla(var(--gold)/0.2)] rounded-xl transition-colors"><X className="w-6 h-6" /></button>
              </div>
            </div>

            <div className="p-6">
              {item.type === "movie" && !item.franchise && (
                <div className="flex gap-8">
                  <div className="flex-shrink-0"><img src={item.poster} alt={item.title} className="w-64 h-96 object-cover rounded-2xl shadow-lg" /></div>
                  <div className="flex-1 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-xl p-4 bg-[hsla(var(--gold)/0.15)]"><div className="flex items-center gap-2 text-foreground/70 mb-2"><Star className="w-4 h-4" /><span className="text-sm font-medium">IMDb Rating</span></div><div className="text-2xl font-bold text-[hsl(var(--primary))]">{item.imdbRating}</div></div>
                      <div className="rounded-xl p-4 bg-[hsla(var(--gold)/0.15)]"><div className="flex items-center gap-2 text-foreground/70 mb-2"><Clock className="w-4 h-4" /><span className="text-sm font-medium">Duration</span></div><div className="text-2xl font-bold text-foreground">{formatWatchTime(item.runtime || 120)}</div></div>
                    </div>
                    {onRemove && (<button onClick={() => { onRemove(item.id, item.type); handleClose(); }} className="btn-primary px-6 py-3">Remove from Watchlist</button>)}
                  </div>
                </div>
              )}

              {item.franchise && franchiseMovies && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {franchiseMovies.sort((a, b) => parseInt(a.year) - parseInt(b.year)).map((movie) => (
                      <FranchiseMovieCard key={movie.id} movie={movie} onRemove={onRemove} onUpdateBookmark={onUpdateBookmark} formatWatchTime={formatWatchTime} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
