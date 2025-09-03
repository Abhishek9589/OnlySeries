import { useState, useEffect } from "react";
import { Download, Upload, ArrowDown, ArrowUp, Filter, Share2, Eye, EyeOff, ArrowUpDown } from "lucide-react";
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

export default function Index() {
  const [bookmarks, setBookmarks] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [backgroundImage, setBackgroundImage] = useState("");
  const [watchFilter, setWatchFilter] = useState("all"); // "all", "watched", "unwatched"
  const [shareToast, setShareToast] = useState(false);
  const [sortType, setSortType] = useState("time_desc");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [showFranchiseDialog, setShowFranchiseDialog] = useState(false);
  const [franchiseName, setFranchiseName] = useState("");

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
            const base = Date.now() - uploaded.length;
            const normalized = uploaded.map((it, i) => ({
              ...it,
              addedAt: it.addedAt ?? (base + i),
            }));
            setBookmarks(normalized);
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
          <div className="fixed top-4 left-1/2 -translate-x-1/2 md:top-6 md:right-6 md:left-auto md:translate-x-0 z-50 flex gap-2 flex-wrap justify-center">
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

            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                setShareToast(true);
                setTimeout(() => setShareToast(false), 3000);
              }}
              className="p-2 md:p-3 bg-card/80 backdrop-blur-sm text-card-foreground rounded-full hover:bg-card transition-colors shadow-lg border border-border/50"
              title="Share Website"
            >
              <Share2 className="w-4 h-4 md:w-5 md:h-5" />
            </button>
            <button
              onClick={downloadBookmarks}
              disabled={!hasBookmarks}
              className="p-2 md:p-3 bg-card/80 backdrop-blur-sm text-card-foreground rounded-full hover:bg-card transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg border border-border/50"
              title="Download Bookmarks"
            >
              <ArrowDown className="w-4 h-4 md:w-5 md:h-5" />
            </button>
            <label
              className="p-2 md:p-3 bg-card/80 backdrop-blur-sm text-card-foreground rounded-full hover:bg-card transition-colors cursor-pointer shadow-lg border border-border/50"
              title="Upload Bookmarks"
            >
              <ArrowUp className="w-4 h-4 md:w-5 md:h-5" />
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
          <div className="relative w-full max-w-md bg-card/95 backdrop-blur-md border border-border/50 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-lg font-semibold mb-3 text-foreground">Name the Franchise</h3>
            <p className="text-sm text-muted-foreground mb-4">Enter a name or choose an existing franchise.</p>

            {/* Existing Franchises */}
            {Array.from(new Set(bookmarks.filter(b => b.type === "movie" && b.franchise).map(b => b.franchise))).length > 0 && (
              <div className="mb-4">
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Existing</div>
                <div className="flex flex-wrap gap-2">
                  {Array.from(new Set(bookmarks.filter(b => b.type === "movie" && b.franchise).map(b => b.franchise))).map((name) => (
                    <button
                      key={name}
                      onClick={() => setFranchiseName(name)}
                      className={`px-2.5 py-1 rounded-full border text-sm ${franchiseName === name ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-foreground hover:bg-card/80"}`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <input
              value={franchiseName}
              onChange={(e) => setFranchiseName(e.target.value)}
              placeholder="Franchise name"
              className="w-full mb-4 px-3 py-2 rounded-md bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const name = franchiseName.trim();
                  if (!name) return;
                  setBookmarks((prev) =>
                    prev.map((it) => {
                      const key = `${it.type}-${it.id}`;
                      if (it.type === "movie" && selectedKeys.includes(key)) {
                        return { ...it, franchise: name };
                      }
                      return it;
                    })
                  );
                  setFranchiseName("");
                  setSelectedKeys([]);
                  setSelectionMode(false);
                  setShowFranchiseDialog(false);
                }
              }}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowFranchiseDialog(false);
                }}
                className="px-4 py-2 rounded-md bg-card border border-border text-foreground hover:bg-card/80 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const name = franchiseName.trim();
                  if (!name) return;
                  setBookmarks((prev) =>
                    prev.map((it) => {
                      const key = `${it.type}-${it.id}`;
                      if (it.type === "movie" && selectedKeys.includes(key)) {
                        return { ...it, franchise: name };
                      }
                      return it;
                    })
                  );
                  setFranchiseName("");
                  setSelectedKeys([]);
                  setSelectionMode(false);
                  setShowFranchiseDialog(false);
                }}
                className="px-4 py-2 rounded-md bg-primary text-primary-foreground"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
      <ScrollToTop />
    </div>
  );
}
