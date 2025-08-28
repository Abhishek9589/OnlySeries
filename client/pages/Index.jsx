import { useState, useEffect } from "react";
import { Download, Upload, ArrowDown, ArrowUp, Filter, Share2, Eye, EyeOff } from "lucide-react";
import SearchBar from "../components/SearchBar";
import Timer from "../components/Timer";
import BookmarksGrid from "../components/BookmarksGrid";
import DialogBox from "../components/DialogBox";
import OfflineBanner from "../components/OfflineBanner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";

export default function Index() {
  const [bookmarks, setBookmarks] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [backgroundImage, setBackgroundImage] = useState("");
  const [watchFilter, setWatchFilter] = useState("all"); // "all", "watched", "unwatched"
  const [shareToast, setShareToast] = useState(false);

  // Load bookmarks from localStorage on mount
  useEffect(() => {
    const savedBookmarks = localStorage.getItem("onlyseries-bookmarks");
    if (savedBookmarks) {
      const parsed = JSON.parse(savedBookmarks);
      setBookmarks(parsed);
      // Set background to the most recently added item
      if (parsed.length > 0) {
        setBackgroundImage(parsed[parsed.length - 1].poster);
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

  const handleAddBookmark = (item) => {
    const franchise =
      item.type === "movie" ? detectFranchise(item.title) : undefined;

    // Check if item already exists
    const exists = bookmarks.some(
      (bookmark) => bookmark.id === item.id && bookmark.type === item.type,
    );

    if (!exists) {
      setBookmarks((prev) => {
        // Check if this item belongs to an existing franchise and inherit watch status
        let inheritedWatchStatus = "unwatched"; // default

        if (franchise) {
          const existingFranchiseItem = prev.find(bookmark => bookmark.franchise === franchise);
          if (existingFranchiseItem) {
            inheritedWatchStatus = existingFranchiseItem.watchStatus || "unwatched";
          }
        }

        const newItem = {
          ...item,
          franchise,
          watchStatus: inheritedWatchStatus
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

  // Filter bookmarks based on watch status
  const filteredBookmarks = bookmarks.filter(item => {
    if (watchFilter === "all") return true;
    if (watchFilter === "watched") return item.watchStatus === "watched";
    if (watchFilter === "unwatched") return item.watchStatus !== "watched";
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
          <div className="fixed top-6 right-6 z-50 flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={`p-3 backdrop-blur-sm text-card-foreground rounded-full hover:bg-card transition-colors shadow-lg border border-border/50 relative ${
                    watchFilter === "all" ? "bg-card/80" :
                    watchFilter === "watched" ? "bg-green-500/80" : "bg-blue-500/80"
                  }`}
                  title="Filter watchlist"
                >
                  <Filter className="w-5 h-5" />
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
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                setShareToast(true);
                setTimeout(() => setShareToast(false), 3000);
              }}
              className="p-3 bg-card/80 backdrop-blur-sm text-card-foreground rounded-full hover:bg-card transition-colors shadow-lg border border-border/50"
              title="Share Website"
            >
              <Share2 className="w-5 h-5" />
            </button>
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
          </div>

          {/* Search Bar */}
          <div className={`mb-12 ${!hasBookmarks ? "" : "mt-8"}`}>
            <SearchBar onAddBookmark={handleAddBookmark} isVisible={true} bookmarks={bookmarks} />
          </div>

          {/* Timer - Only shown when there are bookmarks */}
          {hasBookmarks && (
            <div className="text-center mb-12">
              <Timer bookmarks={bookmarks} watchFilter={watchFilter} />
            </div>
          )}

          {/* Bookmarks Grid - Center-aligned */}
          {hasBookmarks ? (
            <div className="flex justify-center">
              <div className="max-w-7xl w-full">
                <BookmarksGrid
                  bookmarks={filteredBookmarks}
                  onRemoveBookmark={handleRemoveBookmark}
                  onCardClick={handleCardClick}
                  onToggleWatchStatus={handleToggleWatchStatus}
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
    </div>
  );
}
