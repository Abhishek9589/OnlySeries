import { useState, useEffect } from "react";
import { getTVSeason } from "../lib/api";

export default function EpisodeRatingGrid({
  tvId,
  seasons,
}) {
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hoveredEpisode, setHoveredEpisode] = useState(null);

  useEffect(() => {
    if (tvId && seasons > 0) {
      fetchEpisodes();
    }
  }, [tvId, seasons]);

  const fetchEpisodes = async () => {
    setLoading(true);
    try {
      const allEpisodes = [];

      // Fetch episodes for all seasons - no arbitrary limit
      // For very long series (>10 seasons), batch the requests to avoid overwhelming the API
      const batchSize = 5;
      for (let batchStart = 1; batchStart <= seasons; batchStart += batchSize) {
        const batchEnd = Math.min(batchStart + batchSize - 1, seasons);
        
        // Process this batch of seasons in parallel
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
        
        // Add successful results to episodes
        batchResults.forEach((seasonData) => {
          if (seasonData?.episodes) {
            allEpisodes.push(...seasonData.episodes);
          }
        });
        
        // Small delay between batches to be API-friendly
        if (batchEnd < seasons) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      setEpisodes(allEpisodes);
    } catch (error) {
      console.error("Error fetching episodes:", error);
    } finally {
      setLoading(false);
    }
  };

  const getRatingColor = (rating) => {
    // Correct color scheme with exact hex values
    if (rating >= 9.0) return "text-black"; // 9-10 (Excellent): #FFFFFF (Pure White)
    if (rating >= 8.0) return "text-black"; // 8-8.9 (Very Good): #EEEEEE (Light Gray)
    if (rating >= 7.0) return "text-white"; // 7-7.9 (Good): #76ABAE (Muted Teal)
    if (rating >= 5.0) return "text-white"; // 5-6.9 (Average): #31363F (Dark Gray Blue)
    return "text-white"; // 1-4.9 (Very Poor): #222831 (Dark Navy Black)
  };

  const getRatingBgStyle = (rating) => {
    if (rating >= 9.0) return { backgroundColor: "#FFFFFF" }; // Pure White
    if (rating >= 8.0) return { backgroundColor: "#CCCCCC" }; // More distinct Light Gray
    if (rating >= 7.0) return { backgroundColor: "#76ABAE" }; // Muted Teal
    if (rating >= 5.0) return { backgroundColor: "#31363F" }; // Dark Gray Blue
    return { backgroundColor: "#222831" }; // Dark Navy Black
  };

  const handleMouseEnter = (episode) => {
    setHoveredEpisode(episode);
  };

  const handleMouseLeave = () => {
    setHoveredEpisode(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading episode ratings...</div>
      </div>
    );
  }

  if (episodes.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        No episode ratings available
      </div>
    );
  }

  // Group episodes by season and sort
  const episodesBySeason = episodes.reduce(
    (acc, episode) => {
      const season = episode.season_number;
      if (!acc[season]) acc[season] = [];
      acc[season].push(episode);
      return acc;
    },
    {},
  );

  // Sort episodes within each season
  Object.keys(episodesBySeason).forEach(season => {
    episodesBySeason[parseInt(season)].sort((a, b) => a.episode_number - b.episode_number);
  });

  // Get max episodes in any season to determine grid width
  const maxEpisodesInSeason = Math.max(
    ...Object.values(episodesBySeason).map(seasonEpisodes => seasonEpisodes.length)
  );

  // Get sorted season numbers
  const sortedSeasons = Object.keys(episodesBySeason)
    .map(s => parseInt(s))
    .sort((a, b) => a - b);

  return (
    <div className="relative w-full">
      {/* Grid Labels */}
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

      <div className="overflow-x-auto custom-scrollbar">
        <div className="min-w-max">
          {/* Header with episode numbers */}
          <div className="flex items-center gap-1 mb-2">
            <div className="w-12 text-center text-xs font-medium text-muted-foreground flex-shrink-0">
              S/E
            </div>
            {Array.from({ length: maxEpisodesInSeason }, (_, i) => (
              <div key={i} className="w-12 text-center text-xs font-medium text-muted-foreground flex-shrink-0">
                {i + 1}
              </div>
            ))}
          </div>

          {/* Matrix Grid Layout - Rows = Seasons, Columns = Episodes */}
          <div className="space-y-1">
            {sortedSeasons.map((seasonNum) => (
              <div key={seasonNum} className="flex items-center gap-1">
                {/* Season number */}
                <div className="w-12 text-center text-sm font-medium text-muted-foreground flex-shrink-0">
                  {seasonNum}
                </div>
                
                {/* Episode squares for this season */}
                {Array.from({ length: maxEpisodesInSeason }, (_, episodeIndex) => {
                  const episode = episodesBySeason[seasonNum]?.[episodeIndex];
                  
                  if (!episode) {
                    // Empty cell for seasons with fewer episodes
                    return (
                      <div key={episodeIndex} className="w-12 h-12 border border-border/20 rounded-md flex-shrink-0" />
                    );
                  }

                  return (
                    <div
                      key={episode.id}
                      className={`
                        w-12 h-12 rounded-md flex items-center justify-center text-xs font-bold flex-shrink-0
                        ${getRatingColor(episode.vote_average)}
                        transition-all duration-200 hover:scale-110 cursor-pointer relative
                        hover:shadow-lg hover:z-20
                      `}
                      style={getRatingBgStyle(episode.vote_average)}
                      onMouseEnter={() => handleMouseEnter(episode)}
                      onMouseLeave={handleMouseLeave}
                    >
                      {episode.vote_average > 0
                        ? episode.vote_average.toFixed(1)
                        : "N/A"}
                      
                      {/* Episode name overlay with fade in/out */}
                      {hoveredEpisode?.id === episode.id && (
                        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-card/95 backdrop-blur-sm border border-border/50 rounded-lg px-2 py-1 shadow-xl whitespace-nowrap animate-in fade-in duration-200 z-30">
                          <div className="text-xs font-medium text-foreground">
                            {episode.name}
                          </div>
                        </div>
                      )}
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
