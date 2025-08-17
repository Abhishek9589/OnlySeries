import { useState, useEffect, useRef } from "react";
import { Download, Upload, ArrowDown, ArrowUp, Filter, Eye, EyeOff, Share } from "lucide-react";
import { gsap } from "gsap";
import { useToast } from "@/hooks/use-toast";
import SearchBar from "../components/SearchBar";
import Timer from "../components/Timer";
import BookmarksGrid from "../components/BookmarksGrid";
import DialogBox from "../components/DialogBox";
import { getStreamingAvailability } from "../lib/streaming";

export default function Index() {
  const [bookmarks, setBookmarks] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [backgroundImage, setBackgroundImage] = useState("");
  const [watchFilter, setWatchFilter] = useState("all"); // "all", "watched", "will-watch"
  const filterButtonRef = useRef(null);
  const gridContainerRef = useRef(null);
  const { toast } = useToast();

  // Load bookmarks from localStorage on mount
  useEffect(() => {
    const savedBookmarks = localStorage.getItem("onlyseries-bookmarks");
    if (savedBookmarks) {
      const parsed = JSON.parse(savedBookmarks);

      // Migrate existing bookmarks to include new fields
      const migratedBookmarks = parsed.map(bookmark => ({
        ...bookmark,
        watchStatus: bookmark.watchStatus || "will-watch", // Default to "will-watch" for existing items
        streamingPlatforms: bookmark.streamingPlatforms || [] // Default to empty array
      }));

      setBookmarks(migratedBookmarks);
      // Set background to the most recently added item
      if (migratedBookmarks.length > 0) {
        setBackgroundImage(migratedBookmarks[migratedBookmarks.length - 1].poster);
      }
    }
  }, []);

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

  // Enhanced franchise detection for movie sequels
  const detectFranchise = (title) => {
    // Remove common sequel indicators and clean title
    const cleanTitle = title
      .replace(/\s+(Part\s+)?\d+$/i, "") // Remove "Part 1", "2", etc at end
      .replace(/\s+\d+$/i, "") // Remove numbers at end
      .replace(/\s+(I{1,3}|IV|V|VI|VII|VIII|IX|X)$/i, "") // Remove Roman numerals
      .replace(/:\s*.*$/i, "") // Remove subtitle after colon
      .trim();

    const franchises = [
      // Marvel Universe
      { names: ["Iron Man"], franchise: "Iron Man" },
      { names: ["Thor"], franchise: "Thor" },
      { names: ["Captain America"], franchise: "Captain America" },
      { names: ["Avengers"], franchise: "Avengers" },
      { names: ["Spider-Man", "Spiderman"], franchise: "Spider-Man" },
      { names: ["X-Men"], franchise: "X-Men" },
      {
        names: ["Guardians of the Galaxy"],
        franchise: "Guardians of the Galaxy",
      },
      { names: ["Ant-Man"], franchise: "Ant-Man" },
      { names: ["Doctor Strange"], franchise: "Doctor Strange" },
      { names: ["Black Panther"], franchise: "Black Panther" },
      { names: ["Captain Marvel"], franchise: "Captain Marvel" },

      // DC Universe
      { names: ["Batman"], franchise: "Batman" },
      { names: ["Superman"], franchise: "Superman" },
      { names: ["Wonder Woman"], franchise: "Wonder Woman" },
      { names: ["Justice League"], franchise: "Justice League" },
      { names: ["Aquaman"], franchise: "Aquaman" },
      { names: ["The Flash"], franchise: "The Flash" },

      // Star Wars
      { names: ["Star Wars"], franchise: "Star Wars" },

      // Harry Potter
      { names: ["Harry Potter"], franchise: "Harry Potter" },
      { names: ["Fantastic Beasts"], franchise: "Wizarding World" },

      // Lord of the Rings
      {
        names: ["The Lord of the Rings", "Lord of the Rings"],
        franchise: "Lord of the Rings",
      },
      { names: ["The Hobbit"], franchise: "Middle-earth" },

      // Action Franchises
      {
        names: ["Fast & Furious", "Fast and Furious", "The Fast"],
        franchise: "Fast & Furious",
      },
      { names: ["John Wick"], franchise: "John Wick" },
      {
        names: ["Mission: Impossible", "Mission Impossible"],
        franchise: "Mission: Impossible",
      },
      { names: ["Transformers"], franchise: "Transformers" },
      { names: ["The Matrix"], franchise: "The Matrix" },
      { names: ["Terminator"], franchise: "Terminator" },
      { names: ["Die Hard"], franchise: "Die Hard" },
      { names: ["James Bond", "007"], franchise: "James Bond" },

      // Horror
      { names: ["Halloween"], franchise: "Halloween" },
      { names: ["Friday the 13th"], franchise: "Friday the 13th" },
      {
        names: ["A Nightmare on Elm Street", "Nightmare on Elm Street"],
        franchise: "Nightmare on Elm Street",
      },
      { names: ["Saw"], franchise: "Saw" },
      { names: ["Scream"], franchise: "Scream" },

      // Sci-Fi
      { names: ["Alien"], franchise: "Alien" },
      { names: ["Predator"], franchise: "Predator" },
      { names: ["Jurassic Park", "Jurassic World"], franchise: "Jurassic" },
      { names: ["Planet of the Apes"], franchise: "Planet of the Apes" },

      // Comedy
      { names: ["Shrek"], franchise: "Shrek" },
      { names: ["Ice Age"], franchise: "Ice Age" },
      { names: ["Toy Story"], franchise: "Toy Story" },
      { names: ["Cars"], franchise: "Cars" },
      { names: ["Madagascar"], franchise: "Madagascar" },

      // Other Popular
      {
        names: ["Pirates of the Caribbean"],
        franchise: "Pirates of the Caribbean",
      },
      { names: ["Indiana Jones"], franchise: "Indiana Jones" },
      { names: ["Rocky"], franchise: "Rocky" },
      { names: ["Rambo"], franchise: "Rambo" },
      { names: ["The Godfather"], franchise: "The Godfather" },
      { names: ["Back to the Future"], franchise: "Back to the Future" },
    ];

    const titleLower = title.toLowerCase();
    const cleanTitleLower = cleanTitle.toLowerCase();

    for (const { names, franchise } of franchises) {
      for (const name of names) {
        const nameLower = name.toLowerCase();
        // Check both original title and cleaned title
        if (
          titleLower.includes(nameLower) ||
          cleanTitleLower === nameLower ||
          cleanTitleLower.includes(nameLower)
        ) {
          return franchise;
        }
      }
    }
    return undefined;
  };

  const handleAddBookmark = async (item) => {
    const franchise =
      item.type === "movie" ? detectFranchise(item.title) : undefined;

    // Get streaming availability
    const streamingPlatforms = await getStreamingAvailability(item.id, item.title, item.type);

    // Check if this franchise already exists and inherit its watch status
    let inheritedWatchStatus = "will-watch"; // Default
    if (franchise) {
      const existingFranchiseMovie = bookmarks.find(
        (bookmark) => bookmark.franchise === franchise
      );
      if (existingFranchiseMovie) {
        inheritedWatchStatus = existingFranchiseMovie.watchStatus;
      }
    }

    const newItem = {
      ...item,
      franchise,
      watchStatus: inheritedWatchStatus,
      streamingPlatforms: streamingPlatforms || []
    };

    // Check if item already exists
    const exists = bookmarks.some(
      (bookmark) => bookmark.id === item.id && bookmark.type === item.type,
    );

    if (!exists) {
      setBookmarks((prev) => [...prev, newItem]);
    }
  };

  const handleRemoveBookmark = (id, type) => {
    setBookmarks((prev) =>
      prev.filter((item) => !(item.id === id && item.type === type)),
    );
  };

  const toggleWatchStatus = (id, type) => {
    setBookmarks((prev) => {
      // Find the clicked item to check if it's part of a franchise
      const clickedItem = prev.find(item => item.id === id && item.type === type);

      if (clickedItem?.franchise) {
        // If it's a franchise item, toggle ALL movies in the franchise
        const newStatus = clickedItem.watchStatus === "watched" ? "will-watch" : "watched";
        return prev.map((item) => {
          if (item.franchise === clickedItem.franchise) {
            return {
              ...item,
              watchStatus: newStatus
            };
          }
          return item;
        });
      } else {
        // Regular item, just toggle this one
        return prev.map((item) => {
          if (item.id === id && item.type === type) {
            return {
              ...item,
              watchStatus: item.watchStatus === "watched" ? "will-watch" : "watched"
            };
          }
          return item;
        });
      }
    });
  };

  // Filter bookmarks based on watch status
  const filteredBookmarks = bookmarks.filter((item) => {
    if (watchFilter === "all") return true;
    return item.watchStatus === watchFilter;
  });

  // Function to update existing bookmarks with streaming data
  const updateBookmarkWithStreamingData = async (bookmark) => {
    if (!bookmark.streamingPlatforms || bookmark.streamingPlatforms.length === 0) {
      const streamingPlatforms = await getStreamingAvailability(bookmark.id, bookmark.title, bookmark.type);
      setBookmarks((prev) =>
        prev.map((item) => {
          if (item.id === bookmark.id && item.type === bookmark.type) {
            return { ...item, streamingPlatforms: streamingPlatforms || [] };
          }
          return item;
        })
      );
    }
  };

  // Update streaming data for bookmarks that don't have it
  useEffect(() => {
    const updateMissingStreamingData = async () => {
      const bookmarksWithoutStreaming = bookmarks.filter(
        bookmark => !bookmark.streamingPlatforms || bookmark.streamingPlatforms.length === 0
      );

      // Update a few at a time to avoid overwhelming the API
      for (let i = 0; i < Math.min(bookmarksWithoutStreaming.length, 3); i++) {
        await updateBookmarkWithStreamingData(bookmarksWithoutStreaming[i]);
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    };

    if (bookmarks.length > 0) {
      updateMissingStreamingData();
    }
  }, [bookmarks.length]); // Only run when bookmarks count changes

  const handleCardClick = (item) => {
    setSelectedItem(item);
    setDialogOpen(true);
  };

  // Update selectedItem when bookmarks change to keep dialog in sync
  useEffect(() => {
    if (selectedItem && dialogOpen) {
      const updatedItem = bookmarks.find(
        (bookmark) => bookmark.id === selectedItem.id && bookmark.type === selectedItem.type
      );
      if (updatedItem) {
        setSelectedItem(updatedItem);
      }
    }
  }, [bookmarks, selectedItem, dialogOpen]);

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
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const uploaded = JSON.parse(e.target?.result);
          if (Array.isArray(uploaded)) {
            setBookmarks(uploaded);
          }
        } catch (error) {
          console.error("Error parsing uploaded file:", error);
        }
      };
      reader.readAsText(file);
    }
  };

  const shareWatchlist = async () => {
    const totalMovies = bookmarks.filter(item => item.type === 'movie').length;
    const totalSeries = bookmarks.filter(item => item.type === 'tv').length;
    const watchedItems = bookmarks.filter(item => item.watchStatus === 'watched').length;

    const shareText = `Check out my watchlist! I have ${totalMovies} movies and ${totalSeries} series tracked, with ${watchedItems} already watched. Built with OnlySeries.`;
    const shareUrl = window.location.href;
    const fullShareText = `${shareText} ${shareUrl}`;

    const shareData = {
      title: 'My OnlySeries Watchlist',
      text: shareText,
      url: shareUrl
    };

    try {
      // Try Web Share API first (mobile/modern browsers)
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        toast({
          title: "Shared successfully!",
          description: "Your watchlist has been shared.",
        });
        return;
      }

      // Try clipboard API with proper permissions check
      if (navigator.clipboard && window.isSecureContext) {
        try {
          await navigator.clipboard.writeText(fullShareText);
          toast({
            title: "Copied to clipboard!",
            description: "Share text has been copied to your clipboard.",
          });
          return;
        } catch (clipboardError) {
          console.warn('Clipboard API failed:', clipboardError);
        }
      }

      // Fallback: Manual copy with text selection
      const textArea = document.createElement('textarea');
      textArea.value = fullShareText;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      try {
        const successful = document.execCommand('copy');
        if (successful) {
          toast({
            title: "Copied to clipboard!",
            description: "Share text has been copied to your clipboard.",
          });
        } else {
          // Final fallback: show manual copy dialog
          toast({
            title: "Copy manually",
            description: fullShareText,
            duration: 10000,
          });
        }
      } catch (execError) {
        // Final fallback: show manual copy dialog
        toast({
          title: "Copy manually",
          description: fullShareText,
          duration: 10000,
        });
      }

      document.body.removeChild(textArea);

    } catch (error) {
      console.error('Error sharing:', error);
      // Final fallback: show manual copy dialog
      toast({
        title: "Copy manually",
        description: fullShareText,
        duration: 10000,
      });
    }
  };

  const hasBookmarks = bookmarks.length > 0;

  return (
    <div className="min-h-screen relative overflow-hidden">
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

          {/* Import/Export Controls and Filter - Fixed position */}
          <div className="fixed top-6 right-6 z-50 flex gap-2">
            {/* Filter Button - Show when there are bookmarks */}
            {hasBookmarks && (
              <button
                ref={filterButtonRef}
                onClick={() => {
                  const nextFilter =
                    watchFilter === "all" ? "will-watch" :
                    watchFilter === "will-watch" ? "watched" : "all";

                  // Animate filter button
                  gsap.to(filterButtonRef.current, {
                    scale: 0.95,
                    duration: 0.1,
                    yoyo: true,
                    repeat: 1,
                    ease: "power2.out"
                  });

                  // Animate grid items out and in
                  if (gridContainerRef.current) {
                    const cards = gridContainerRef.current.querySelectorAll('[data-bookmark-card]');
                    gsap.to(cards, {
                      opacity: 0,
                      scale: 0.9,
                      duration: 0.2,
                      stagger: 0.02,
                      ease: "power2.out",
                      onComplete: () => {
                        setWatchFilter(nextFilter);
                        // Animate new filtered items in
                        setTimeout(() => {
                          const newCards = gridContainerRef.current?.querySelectorAll('[data-bookmark-card]');
                          if (newCards) {
                            gsap.fromTo(newCards,
                              { opacity: 0, scale: 0.9 },
                              {
                                opacity: 1,
                                scale: 1,
                                duration: 0.3,
                                stagger: 0.02,
                                ease: "power2.out"
                              }
                            );
                          }
                        }, 50);
                      }
                    });
                  } else {
                    setWatchFilter(nextFilter);
                  }
                }}
                className={`p-3 bg-card/80 backdrop-blur-sm text-card-foreground rounded-full hover:bg-card transition-colors shadow-lg border border-border/50 ${
                  watchFilter !== "all" ? "ring-2 ring-primary" : ""
                }`}
                title="Filter by watch status"
              >
                {watchFilter === "all" && <Filter className="w-5 h-5" />}
                {watchFilter === "will-watch" && <Eye className="w-5 h-5 text-primary" />}
                {watchFilter === "watched" && <EyeOff className="w-5 h-5 text-green-500" />}

                {/* Filter count badge */}
                {watchFilter !== "all" && (
                  <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                    {filteredBookmarks.length}
                  </div>
                )}
              </button>
            )}

            <button
              onClick={downloadBookmarks}
              disabled={!hasBookmarks}
              className="p-3 bg-card/80 backdrop-blur-sm text-card-foreground rounded-full hover:bg-card transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg border border-border/50"
              title="Download Bookmarks"
            >
              <ArrowDown className="w-5 h-5" />
            </button>
            <label
              className="p-3 bg-card/80 backdrop-blur-sm text-card-foreground rounded-full hover:bg-card transition-colors cursor-pointer shadow-lg border border-border/50"
              title="Upload Bookmarks"
            >
              <ArrowUp className="w-5 h-5" />
              <input
                type="file"
                accept=".json"
                onChange={uploadBookmarks}
                className="hidden"
              />
            </label>
            <button
              onClick={shareWatchlist}
              disabled={!hasBookmarks}
              className="p-3 bg-card/80 backdrop-blur-sm text-card-foreground rounded-full hover:bg-card transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg border border-border/50"
              title="Share Watchlist"
            >
              <Share className="w-5 h-5" />
            </button>
          </div>

          {/* Search Bar */}
          <div className={`mb-12 ${!hasBookmarks ? "" : "mt-8"}`}>
            <SearchBar onAddBookmark={handleAddBookmark} isVisible={true} bookmarks={bookmarks} />
          </div>

          {/* Timer - Only shown when there are bookmarks */}
          {hasBookmarks && (
            <div className="text-center mb-12">
              <Timer bookmarks={filteredBookmarks} watchFilter={watchFilter} />
            </div>
          )}

          {/* Bookmarks Grid - Center-aligned */}
          {hasBookmarks ? (
            <div className="flex justify-center">
              <div ref={gridContainerRef} className="max-w-7xl w-full">
                <BookmarksGrid
                  bookmarks={filteredBookmarks}
                  onRemoveBookmark={handleRemoveBookmark}
                  onCardClick={handleCardClick}
                  onToggleWatchStatus={toggleWatchStatus}
                />
              </div>
            </div>
          ) : null}

          {/* Dialog Box */}
          <DialogBox
            item={selectedItem}
            isOpen={dialogOpen}
            onClose={() => setDialogOpen(false)}
            onRemove={handleRemoveBookmark}
            onToggleWatchStatus={toggleWatchStatus}
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
    </div>
  );
}
