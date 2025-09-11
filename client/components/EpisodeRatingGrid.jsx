import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { getTVSeason } from "../lib/api";

// In-memory cache for quick repeat opens within the same session
const EPISODE_CACHE = new Map(); // key: `${tvId}` -> { seasons, episodes }
const LS_EPISODES_CACHE_KEY = "tv_episodes_cache_v1";

const readEpisodesCache = (tvId) => {
  const mem = EPISODE_CACHE.get(String(tvId));
  if (mem) return mem;
  try {
    const raw = localStorage.getItem(LS_EPISODES_CACHE_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    const entry = obj[String(tvId)];
    if (!entry || !Array.isArray(entry.episodes)) return null;
    return entry;
  } catch {
    return null;
  }
};

const writeEpisodesCache = (tvId, data) => {
  try {
    EPISODE_CACHE.set(String(tvId), data);
    const raw = localStorage.getItem(LS_EPISODES_CACHE_KEY);
    const obj = raw ? JSON.parse(raw) : {};
    obj[String(tvId)] = data;
    localStorage.setItem(LS_EPISODES_CACHE_KEY, JSON.stringify(obj));
  } catch {}
};

function TooltipPortal({ visible, x, y, content }) {
  const [portalEl] = useState(() => document.createElement("div"));

  useEffect(() => {
    portalEl.style.position = "absolute";
    portalEl.style.left = "0";
    portalEl.style.top = "0";
    document.body.appendChild(portalEl);
    return () => {
      document.body.removeChild(portalEl);
    };
  }, [portalEl]);

  // compute style each render
  const tooltip = (
    <div
      aria-hidden={!visible}
      style={{
        position: "fixed",
        left: x != null ? x : 0,
        top: y != null ? y : 0,
        transform: "translate(-50%, -100%)",
        pointerEvents: "none",
        zIndex: 2147483647,
      }}
    >
      {content}
    </div>
  );

  return ReactDOM.createPortal(tooltip, portalEl);
}

export default function EpisodeRatingGrid({ tvId, seasons, fullScreen = false, onCloseFullScreen, title }) {
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showLoader, setShowLoader] = useState(false);
  // hovered info contains { id, name, x, y }
  const [hovered, setHovered] = useState(null);
  // responsive cell size used across all series; will update on resize
  const [cellSize, setCellSize] = useState(64);

  const computeCellSize = () => {
    if (typeof window === 'undefined') return 64;
    const w = window.innerWidth;
    // Phones: smaller cells, Tablets: medium, Desktop: larger
    if (w < 420) return 36;
    if (w < 640) return 44;
    if (w < 1024) return 56;
    return 64;
  };

  const computeFontSize = (size) => {
    if (size <= 36) return 10; // px
    if (size <= 44) return 12;
    if (size <= 56) return 13;
    return 14;
  };

  useEffect(() => {
    // initialize
    setCellSize(computeCellSize());
    const onResize = () => setCellSize(computeCellSize());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (tvId && seasons > 0) {
      // Try cache first
      const cached = readEpisodesCache(tvId);
      if (cached && Number.isFinite(cached.seasons) && cached.seasons >= seasons) {
        setEpisodes(cached.episodes);
        setLoading(false);
        setShowLoader(false);
        return;
      }
      fetchEpisodes();
    }
  }, [tvId, seasons]);

  // Prevent page scroll while fullscreen overlay is open
  useEffect(() => {
    if (!fullScreen) return;
    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;
    // Hide vertical scroll
    document.body.style.overflow = "hidden";
    // Prevent layout shift by preserving scrollbar width if any
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    return () => {
      document.body.style.overflow = prevOverflow || "";
      document.body.style.paddingRight = prevPaddingRight || "";
    };
  }, [fullScreen]);

  const fetchEpisodes = async () => {
    setLoading(true);
    // Only show the loader for fullscreen matrix views (when user opens the series to watch)
    setShowLoader(!!fullScreen);

    try {
      const allEpisodes = [];
      const batchSize = 5;
      for (let batchStart = 1; batchStart <= seasons; batchStart += batchSize) {
        const batchEnd = Math.min(batchStart + batchSize - 1, seasons);
        const batchPromises = [];
        for (let season = batchStart; season <= batchEnd; season++) {
          batchPromises.push(
            getTVSeason(tvId, season).catch((error) => {
              console.error(`Error fetching season ${season}:`, error);
              return null;
            })
          );
        }
        const batchResults = await Promise.all(batchPromises);
        batchResults.forEach((seasonData) => {
          if (seasonData?.episodes) allEpisodes.push(...seasonData.episodes);
        });
        if (batchEnd < seasons) await new Promise((r) => setTimeout(r, 100));
      }
      setEpisodes(allEpisodes);
      writeEpisodesCache(tvId, { seasons, episodes: allEpisodes });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setShowLoader(false);
    }
  };

  const getStyleForRating = (rating) => {
    // Map rating ranges to explicit hex colors provided by the user
    const bgText = (bg, color) => ({ backgroundColor: bg, color });
    if (!Number.isFinite(rating)) return bgText("#222831", "#EEEEEE");
    const r = Number(rating);
    if (r >= 9.0) return bgText("#EEEEEE", "#222831");
    if (r >= 8.0) return bgText("#8FCACD", "#222831");
    if (r >= 7.0) return bgText("#76ABAE", "#222831");
    if (r >= 6.0) return bgText("#45525F", "#EEEEEE");
    if (r >= 5.0) return bgText("#31363F", "#EEEEEE");
    return bgText("#222831", "#EEEEEE");
  };

  const handleMouseEnter = (episode, e) => {
    // compute viewport-safe position
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    // place tooltip slightly above the cell
    let top = rect.top - 8; // 8px above

    // If tooltip would go above viewport, place below
    const tooltipHeightEstimate = 40;
    if (top - tooltipHeightEstimate < 8) {
      top = rect.bottom + tooltipHeightEstimate / 2;
    }

    // Clamp horizontally
    const clampedX = Math.max(12, Math.min(window.innerWidth - 12, centerX));
    setHovered({ id: episode.id, name: episode.name, x: clampedX, y: top });
  };

  const handleMouseLeave = () => setHovered(null);

  if (loading && showLoader) {
    if (fullScreen) {
      return ReactDOM.createPortal(
        <div className="fixed inset-0 z-50 bg-background flex items-center justify-center" style={{ overflow: "hidden" }}>
          <div className="absolute inset-0 bg-card/60 backdrop-blur-sm" />
          <div className="relative z-10 flex flex-col items-center gap-4 p-6">
            <div className="animate-spin w-10 h-10 border-4 border-t-transparent rounded-full border-primary" />
            <div className="text-muted-foreground">Loading episode ratings...</div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onCloseFullScreen) onCloseFullScreen();
              }}
              className="mt-2 px-3 py-1 rounded-md bg-card border border-border text-foreground hover:bg-card/80"
            >
              Close
            </button>
          </div>
        </div>,
        document.body
      );
    }

    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading episode ratings...</div>
      </div>
    );
  }

  if (!loading && episodes.length === 0) {
    if (fullScreen) {
      return ReactDOM.createPortal(
        <div className="fixed inset-0 z-50 bg-background flex items-center justify-center" style={{ overflow: "hidden" }}>
          <div className="absolute inset-0 bg-card/60 backdrop-blur-sm" onClick={() => onCloseFullScreen && onCloseFullScreen()} />
          <div className="relative z-10 p-6 bg-card/95 border border-border/50 rounded-2xl shadow-2xl text-center">
            <div className="text-muted-foreground">No episode ratings available</div>
            <div className="mt-4">
              <button onClick={() => onCloseFullScreen && onCloseFullScreen()} className="px-3 py-1 rounded-md bg-card border border-border text-foreground hover:bg-card/80">Close</button>
            </div>
          </div>
        </div>,
        document.body
      );
    }

    return (
      <div className="text-center p-8 text-muted-foreground">No episode ratings available</div>
    );
  }

  const episodesBySeason = episodes.reduce((acc, episode) => {
    const season = episode.season_number;
    if (!acc[season]) acc[season] = [];
    acc[season].push(episode);
    return acc;
  }, {});

  Object.keys(episodesBySeason).forEach((season) => {
    episodesBySeason[parseInt(season)].sort((a, b) => a.episode_number - b.episode_number);
  });

  const maxEpisodesInSeason = Math.max(...Object.values(episodesBySeason).map((s) => s.length));
  const sortedSeasons = Object.keys(episodesBySeason).map((s) => parseInt(s)).sort((a, b) => a - b);

  // If not fullscreen, render the compact grid used in dialog
  if (!fullScreen) {
    return (
      <div className="relative w-full">
        {hovered && (
          <TooltipPortal
            visible={!!hovered}
            x={hovered.x}
            y={hovered.y}
            content={(
              <div className="bg-card/95 backdrop-blur-sm border border-border/50 rounded-lg px-3 py-2 shadow-xl whitespace-nowrap text-sm font-medium text-foreground">
                <div className="font-semibold">{hovered.name}</div>
              </div>
            )}
          />
        )}

        <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 border border-border rounded"></div>
            <span>episodes (columns)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 border border-border rounded"></div>
            <span>seasons (rows)</span>
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar" style={{ scrollbarGutter: "stable" }}>
          <div className="min-w-max" style={{ width: Math.max(220, Math.min(1200, maxEpisodesInSeason * cellSize)) }}>
            <div className="flex items-center gap-1 mb-2">
              <div style={{ width: cellSize, height: cellSize }} className="text-center text-xs font-medium text-muted-foreground flex-shrink-0">S/E</div>
              {Array.from({ length: maxEpisodesInSeason }, (_, i) => (
                <div key={i} style={{ width: cellSize, height: cellSize }} className="text-center text-xs font-medium text-muted-foreground flex-shrink-0">{i + 1}</div>
              ))}
            </div>

            <div className="space-y-1 custom-scrollbar" style={{ maxHeight: 384, overflowY: sortedSeasons.length > 8 ? "auto" : "visible", scrollbarGutter: "stable both-edges" }}>
              {sortedSeasons.map((seasonNum) => (
                <div key={seasonNum} className="flex items-center gap-1">
                  <div style={{ width: cellSize, height: cellSize }} className="text-center text-sm font-medium text-muted-foreground flex-shrink-0">{seasonNum}</div>

                  {Array.from({ length: maxEpisodesInSeason }, (_, episodeIndex) => {
                    const episode = episodesBySeason[seasonNum]?.[episodeIndex];
                    if (!episode) return <div key={episodeIndex} style={{ width: cellSize, height: cellSize }} className="border border-border/20 rounded-md flex-shrink-0 bg-card/80" />;

                    const styleForRating = getStyleForRating(episode.vote_average);

                    return (
                      <div
                        key={episode.id}
                        className="rounded-md flex items-center justify-center font-bold cursor-pointer relative"
                        style={{ width: cellSize, height: cellSize, ...styleForRating, overflow: 'hidden' }}
                        onMouseEnter={(e) => handleMouseEnter(episode, e)}
                        onMouseLeave={handleMouseLeave}
                      >
                        <div style={{ fontSize: computeFontSize(cellSize), lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {episode.vote_average > 0 ? episode.vote_average.toFixed(1) : "N/A"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fullscreen layout: use fixed cell size across all series
  const rows = sortedSeasons.length || 1;
  const cols = Math.max(1, maxEpisodesInSeason);
  const GAP = 6; // px spacing between blocks in fullscreen
  const PADDING = 32; // px padding around grid
  const availableWidth = Math.max(200, window.innerWidth - PADDING * 2);
  const availableHeight = Math.max(200, window.innerHeight - PADDING * 2 - 80); // leave space for title/header

  const gridColsWidth = cols * cellSize + (cols - 1) * GAP;
  const labelWidth = Math.max(48, Math.min(96, Math.floor(cellSize * 1.15)));
  const totalGridWidth = labelWidth + gridColsWidth;

  const needHorizontalScroll = totalGridWidth > availableWidth;

  // If rows still don't fit even with MIN_CELL, allow vertical scroll (rare)
  const gridRowsHeight = rows * cellSize + (rows - 1) * GAP;
  const needVerticalScroll = gridRowsHeight > availableHeight;

  // Prepare flat cells: for each season, first the label cell then episode cells
  const cells = [];
  for (const seasonNum of sortedSeasons) {
    // season label
    cells.push({ key: `label-${seasonNum}`, season: seasonNum, isLabel: true });
    for (let episodeIndex = 0; episodeIndex < cols; episodeIndex++) {
      const episode = episodesBySeason[seasonNum]?.[episodeIndex] || null;
      cells.push({ key: `cell-${seasonNum}-${episodeIndex}`, episode, season: seasonNum, episodeIndex });
    }
  }

  const wrapperStyle = {
    maxWidth: Math.min(totalGridWidth, availableWidth) + PADDING,
    width: Math.min(totalGridWidth, availableWidth),
  };

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-50 bg-background flex items-center justify-center"
      style={{ overflow: "hidden" }}
    >
      <div
        className="absolute inset-0 bg-card/60 backdrop-blur-sm"
        onClick={() => onCloseFullScreen && onCloseFullScreen()}
      />

      {/* Centered content */}
      <div className="relative flex items-center justify-center" style={{ width: "100%", height: "100%" }}>
        {/* Top bar: centered title with reserved right space for key + close */}
        <div className="absolute top-6 left-0 right-0 z-20 flex items-center justify-center">
          <div className="text-center px-4 w-full max-w-full">
            {title && (
              <div className="mx-auto text-2xl md:text-3xl font-bold text-foreground drop-shadow-md truncate" style={{ maxWidth: 'min(80vw, 900px)' }}>{title}</div>
            )}
          </div>
        </div>

        {/* Seasons axis label (subtle, below title) */}
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-20 text-center text-sm text-muted-foreground">
        </div>

        <div
          className="relative z-10"
          style={{
            width: Math.min(totalGridWidth, availableWidth),
            maxWidth: "100%",
            height: availableHeight,
            padding: 12,
            boxSizing: 'border-box'
          }}
        >
          {/* Scroll container that holds header and grid so they scroll together */}
          <div
            style={{
              width: Math.min(totalGridWidth, availableWidth),
              height: '100%',
              overflowX: needHorizontalScroll ? "auto" : "hidden",
              overflowY: "auto",
            }}
          >
            {/* Episode header row (first cell is empty for season labels) */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: ` ${labelWidth}px repeat(${cols}, ${cellSize}px)`,
                gap: `${GAP}px`,
                width: totalGridWidth,
                alignItems: "center",
                marginBottom: 8,
                position: "sticky",
                top: 0,
                zIndex: 40,
                background: "rgba(0,0,0,0.25)",
                backdropFilter: "blur(6px)",
                WebkitBackdropFilter: "blur(6px)",
              }}
            >
              <div style={{ width: labelWidth, height: cellSize, position: 'sticky', left: 0, zIndex: 50, background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }} className="flex items-center justify-center text-sm font-semibold text-muted-foreground">S / E</div>
              {Array.from({ length: cols }, (_, i) => (
                <div key={`hdr-${i}`} style={{ width: cellSize, height: cellSize, background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }} className="flex items-center justify-center text-muted-foreground">
                  <div style={{ fontSize: computeFontSize(cellSize), lineHeight: 1 }}>{`E${i + 1}`}</div>
                </div>
              ))}
            </div>

            {/* Main grid */}
            <div
              className="rounded-md"
              style={{
                display: "grid",
                gridTemplateColumns: ` ${labelWidth}px repeat(${cols}, ${cellSize}px)`,
                gridAutoRows: `${cellSize}px`,
                gap: `${GAP}px`,
                width: totalGridWidth,
              }}
            >
              {sortedSeasons.map((seasonNum) => (
                <React.Fragment key={`row-${seasonNum}`}>
                  <div style={{ width: labelWidth, height: cellSize, position: 'sticky', left: 0, zIndex: 30, background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }} className="flex items-center justify-center text-muted-foreground">
                    <div style={{ fontSize: computeFontSize(cellSize), lineHeight: 1 }}>{`S ${seasonNum}`}</div>
                  </div>
                  {Array.from({ length: cols }, (_, episodeIndex) => {
                    const episode = episodesBySeason[seasonNum]?.[episodeIndex] || null;
                    if (!episode) {
                      return <div key={`empty-${seasonNum}-${episodeIndex}`} style={{ width: cellSize, height: cellSize }} className="rounded-md border border-border/20 bg-card/80" />;
                    }

                    const styleForRating = getStyleForRating(episode.vote_average);

                    return (
                      <div
                        key={`cell-${seasonNum}-${episodeIndex}`}
                        style={{ width: cellSize, height: cellSize, ...styleForRating, overflow: 'hidden' }}
                        className="rounded-md flex items-center justify-center font-bold cursor-pointer relative"
                        onMouseEnter={(e) => handleMouseEnter(episode, e)}
                        onMouseLeave={handleMouseLeave}
                      >
                        <div style={{ fontSize: computeFontSize(cellSize), lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{episode.vote_average > 0 ? episode.vote_average.toFixed(1) : "N/A"}</div>
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>


        {/* Close control */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (onCloseFullScreen) onCloseFullScreen();
          }}
          style={{ zIndex: 99999 }}
          className="absolute top-6 right-6 p-2 rounded-md bg-card/90 border border-border text-foreground hover:bg-card transition-colors"
        >
          Close
        </button>
      </div>
    </div>,
    document.body
  );
}
