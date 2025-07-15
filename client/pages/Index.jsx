import { useState, useEffect } from "react";
import {
  Search,
  Share2,
  Film,
  Star,
  Calendar,
  Clock,
  X,
  Type,
  Layers,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const TMDB_API_KEY = "9f5749f3d13f732d1ec069bde976daba";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w342";
const TMDB_BACKDROP_BASE_URL = "https://image.tmdb.org/t/p/w1280";

// Simple API key validation
const validateApiKey = async () => {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/movie/11?api_key=${TMDB_API_KEY}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      },
    );
    return response.ok;
  } catch (error) {
    console.error("API key validation failed:", error);
    return false;
  }
};

// Trending content data
const NETFLIX_TRENDING = [
  {
    id: 1399,
    title: "Game of Thrones",
    year: "2011",
    rating: 9.2,
    poster: "https://image.tmdb.org/t/p/w342/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg",
    type: "tv",
  },
  {
    id: 1396,
    title: "Breaking Bad",
    year: "2008",
    rating: 9.5,
    poster: "https://image.tmdb.org/t/p/w342/3xnWaLQjelJDDF7LT1WBo6f4BRe.jpg",
    type: "tv",
  },
  {
    id: 82856,
    title: "The Mandalorian",
    year: "2019",
    rating: 8.7,
    poster: "https://image.tmdb.org/t/p/w342/sWgBv7LV2PRoQgkxwlibdGXKz1S.jpg",
    type: "tv",
  },
  {
    id: 85552,
    title: "Euphoria",
    year: "2019",
    rating: 8.4,
    poster: "https://image.tmdb.org/t/p/w342/3Q0hd3heuWwDWpwcDkhQOA6TYWI.jpg",
    type: "tv",
  },
  {
    id: 94997,
    title: "House of the Dragon",
    year: "2022",
    rating: 8.4,
    poster: "https://image.tmdb.org/t/p/w342/7QMsOTMUswlwxJP0rTTZfmz2tX2.jpg",
    type: "tv",
  },
  {
    id: 157336,
    title: "Interstellar",
    year: "2014",
    rating: 8.6,
    poster: "https://image.tmdb.org/t/p/w342/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
    type: "movie",
  },
  {
    id: 550,
    title: "Fight Club",
    year: "1999",
    rating: 8.8,
    poster: "https://image.tmdb.org/t/p/w342/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
    type: "movie",
  },
  {
    id: 238,
    title: "The Godfather",
    year: "1972",
    rating: 9.2,
    poster: "https://image.tmdb.org/t/p/w342/3bhkrj58Vtu7enYsRolD1fZdja1.jpg",
    type: "movie",
  },
  {
    id: 424,
    title: "Schindler's List",
    year: "1993",
    rating: 9.0,
    poster: "https://image.tmdb.org/t/p/w342/sF1U4EUQS8YHUYjNl3pMGNIQyr0.jpg",
    type: "movie",
  },
  {
    id: 13,
    title: "Forrest Gump",
    year: "1994",
    rating: 8.8,
    poster: "https://image.tmdb.org/t/p/w342/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg",
    type: "movie",
  },
];

const AMAZON_PRIME_TRENDING = [
  {
    id: 60625,
    title: "The Boys",
    year: "2019",
    rating: 8.7,
    poster: "https://image.tmdb.org/t/p/w342/stTEycfG9928HYGEISBFaG1ngjM.jpg",
    type: "tv",
  },
  {
    id: 76479,
    title: "The Marvelous Mrs. Maisel",
    year: "2017",
    rating: 8.7,
    poster: "https://image.tmdb.org/t/p/w342/6r7rB9H8ygNtTVU2K3H6e87BIh.jpg",
    type: "tv",
  },
  {
    id: 63174,
    title: "Lucifer",
    year: "2016",
    rating: 8.1,
    poster: "https://image.tmdb.org/t/p/w342/ekZobS8isE6mA53RAiGDG93hBxL.jpg",
    type: "tv",
  },
  {
    id: 84958,
    title: "Loki",
    year: "2021",
    rating: 8.2,
    poster: "https://image.tmdb.org/t/p/w342/kEl2t3OhXc3Zb9FBh1AuYzRTgZp.jpg",
    type: "tv",
  },
  {
    id: 71712,
    title: "The Good Doctor",
    year: "2017",
    rating: 8.1,
    poster: "https://image.tmdb.org/t/p/w342/6tfT03sGp9k4c0J3dypjrI8TSAI.jpg",
    type: "tv",
  },
  {
    id: 324857,
    title: "Spider-Man: Into the Spider-Verse",
    year: "2018",
    rating: 8.4,
    poster: "https://image.tmdb.org/t/p/w342/iiZZdoQBEYBv6id8su7ImL0oCbD.jpg",
    type: "movie",
  },
  {
    id: 299536,
    title: "Avengers: Infinity War",
    year: "2018",
    rating: 8.3,
    poster: "https://image.tmdb.org/t/p/w342/7WsyChQLEftFiDOVTGkv3hFpyyt.jpg",
    type: "movie",
  },
  {
    id: 278,
    title: "The Shawshank Redemption",
    year: "1994",
    rating: 9.3,
    poster: "https://image.tmdb.org/t/p/w342/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg",
    type: "movie",
  },
  {
    id: 680,
    title: "Pulp Fiction",
    year: "1994",
    rating: 8.9,
    poster: "https://image.tmdb.org/t/p/w342/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg",
    type: "movie",
  },
  {
    id: 155,
    title: "The Dark Knight",
    year: "2008",
    rating: 9.0,
    poster: "https://image.tmdb.org/t/p/w342/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
    type: "movie",
  },
  {
    id: 79830,
    title: "Jack Ryan",
    year: "2018",
    rating: 8.1,
    poster: "https://image.tmdb.org/t/p/w342/7TTgUOzu2hnAs5kj7CJNlEWdnAV.jpg",
    type: "tv",
  },
  {
    id: 158022,
    title: "The Terminal List",
    year: "2022",
    rating: 8.0,
    poster: "https://image.tmdb.org/t/p/w342/71f3JHlJCP6V7LhHHiKZOlWNpNd.jpg",
    type: "tv",
  },
  {
    id: 95396,
    title: "The Wheel of Time",
    year: "2021",
    rating: 7.1,
    poster: "https://image.tmdb.org/t/p/w342/mpgDeLhl8HbhI03XLB7iKO6M6JE.jpg",
    type: "tv",
  },
  {
    id: 118956,
    title: "Reacher",
    year: "2022",
    rating: 8.1,
    poster: "https://image.tmdb.org/t/p/w342/jFuH0md41x5mOqTPJNNPqE6lM02.jpg",
    type: "tv",
  },
  {
    id: 73375,
    title: "Upload",
    year: "2020",
    rating: 7.9,
    poster: "https://image.tmdb.org/t/p/w342/m5SJNBMoShxtJHYMiZHi9m1bfT6.jpg",
    type: "tv",
  },
  {
    id: 84773,
    title: "The Man in the High Castle",
    year: "2015",
    rating: 8.0,
    poster: "https://image.tmdb.org/t/p/w342/7YAYjfOl0RMzKQfZy2Ftu4sBSXu.jpg",
    type: "tv",
  },
];

const DISNEY_HOTSTAR_TRENDING = [
  {
    id: 103768,
    title: "The Falcon and the Winter Soldier",
    year: "2021",
    rating: 7.2,
    poster: "https://image.tmdb.org/t/p/w342/6kbAMLteGO8yyewYau6bJ683sw7.jpg",
    type: "tv",
  },
  {
    id: 95557,
    title: "Invincible",
    year: "2021",
    rating: 8.7,
    poster: "https://image.tmdb.org/t/p/w342/yDWJYRAwMNKbIYT8ZB33qy84uzO.jpg",
    type: "tv",
  },
  {
    id: 1402,
    title: "The Walking Dead",
    year: "2010",
    rating: 8.2,
    poster: "https://image.tmdb.org/t/p/w342/rqeYMLryjcawh2JeRpCVUDXYM5b.jpg",
    type: "tv",
  },
  {
    id: 456,
    title: "The Lion King",
    year: "1994",
    rating: 8.5,
    poster: "https://image.tmdb.org/t/p/w342/sKCr78MXSLixwmZ8DyJLrpMsd15.jpg",
    type: "movie",
  },
  {
    id: 12,
    title: "Finding Nemo",
    year: "2003",
    rating: 8.2,
    poster: "https://image.tmdb.org/t/p/w342/eHuGQ10FUzK1mdOY69wF5pGgEf5.jpg",
    type: "movie",
  },
  {
    id: 10681,
    title: "WALL·E",
    year: "2008",
    rating: 8.2,
    poster: "https://image.tmdb.org/t/p/w342/hbhFnRzzg6ZDmm8YAmxBnQpQIPh.jpg",
    type: "movie",
  },
  {
    id: 862,
    title: "Toy Story",
    year: "1995",
    rating: 8.3,
    poster: "https://image.tmdb.org/t/p/w342/uXDfjJbdP4ijW5hWSBrPrlKpxab.jpg",
    type: "movie",
  },
  {
    id: 2062,
    title: "Ratatouille",
    year: "2007",
    rating: 8.1,
    poster: "https://image.tmdb.org/t/p/w342/npHNjldbeTHdKKw28bJKs7lzqzj.jpg",
    type: "movie",
  },
  {
    id: 508947,
    title: "Turning Red",
    year: "2022",
    rating: 7.4,
    poster: "https://image.tmdb.org/t/p/w342/qsdjk9oAKSQMWs0Vt5Pyfh6O4GZ.jpg",
    type: "movie",
  },
  {
    id: 568124,
    title: "Encanto",
    year: "2021",
    rating: 7.2,
    poster: "https://image.tmdb.org/t/p/w342/4j0PNHkMr5ax3IA8tjtxcmPU3QT.jpg",
    type: "movie",
  },
];

export default function Index() {
  const [searchQuery, setSearchQuery] = useState("");
  const [recommendations, setRecommendations] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [selectedContent, setSelectedContent] = useState([]);
  const [totalWatchTime, setTotalWatchTime] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
  });
  const [previousWatchTime, setPreviousWatchTime] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
  });
  const [animatedWatchTime, setAnimatedWatchTime] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [showEpisodeDetails, setShowEpisodeDetails] = useState(null);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [isCountingAnimation, setIsCountingAnimation] = useState(false);
  const [failedImages, setFailedImages] = useState(new Set());
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  const handleImageError = (posterUrl) => {
    setFailedImages((prev) => new Set([...prev, posterUrl]));
  };

  // Touch handlers for better mobile support
  const handleTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    // You can add swipe navigation logic here if needed
    // For now, we'll focus on making existing interactions touch-friendly
  };

  // Enhanced click handler that works better with touch
  const handleContentInteraction = (content, action = "select") => {
    if (action === "select") {
      handleContentSelect(content);
    } else if (action === "tv-click") {
      handleTVSeriesClick(content);
    }
  };

  // Enhanced remove handler for touch
  const handleRemoveInteraction = (e, contentId, contentType) => {
    e.stopPropagation();
    e.preventDefault();
    removeSelectedContent(contentId, contentType);
  };

  // Detect touch device
  const isTouchDevice = () => {
    return (
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0 ||
      navigator.msMaxTouchPoints > 0
    );
  };

  // Prevent double-tap zoom on mobile
  useEffect(() => {
    let lastTouchEnd = 0;
    const preventDefault = (e) => {
      const now = new Date().getTime();
      if (now - lastTouchEnd <= 300) {
        e.preventDefault();
      }
      lastTouchEnd = now;
    };

    document.addEventListener("touchend", preventDefault, { passive: false });

    return () => {
      document.removeEventListener("touchend", preventDefault);
    };
  }, []);

  const [currentPage, setCurrentPage] = useState({
    netflix: 0,
    prime: 0,
    disney: 0,
  });

  const calculateTotalWatchTime = (contentList) => {
    const totalMinutes = contentList.reduce(
      (acc, content) => acc + content.watchTime.totalMinutes,
      0,
    );
    const days = Math.floor(totalMinutes / (24 * 60));
    const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
    const minutes = totalMinutes % 60;

    // Store previous values for animation
    setPreviousWatchTime(totalWatchTime);
    setTotalWatchTime({ days, hours, minutes });

    // Start counting animation
    animateCounter(totalWatchTime, { days, hours, minutes });
  };

  const animateCounter = (from, to) => {
    // Only animate if there's a change
    if (
      from.days === to.days &&
      from.hours === to.hours &&
      from.minutes === to.minutes
    ) {
      setAnimatedWatchTime(to);
      return;
    }

    setIsCountingAnimation(true);
    const duration = 1200; // Animation duration in ms
    const steps = 40; // Number of animation steps
    const stepTime = duration / steps;

    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;

      // Easing function for smooth animation (ease-out)
      const easeProgress = 1 - Math.pow(1 - progress, 3);

      const animatedDays = Math.floor(
        from.days + (to.days - from.days) * easeProgress,
      );
      const animatedHours = Math.floor(
        from.hours + (to.hours - from.hours) * easeProgress,
      );
      const animatedMinutes = Math.floor(
        from.minutes + (to.minutes - from.minutes) * easeProgress,
      );

      setAnimatedWatchTime({
        days: animatedDays,
        hours: animatedHours,
        minutes: animatedMinutes,
      });

      if (currentStep >= steps) {
        clearInterval(timer);
        setAnimatedWatchTime(to); // Ensure final values are exact
        setIsCountingAnimation(false);
      }
    }, stepTime);
  };

  const getMovieDetails = async (movieId) => {
    try {
      const response = await fetch(`/api/tmdb/movie/${movieId}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        runtime: data.runtime || 0,
        backdropPath: data.backdrop_path,
      };
    } catch (error) {
      console.error("Error fetching movie details:", error);
      return { runtime: 0, backdropPath: null };
    }
  };

  const getTVDetails = async (tvId) => {
    try {
      const response = await fetch(`/api/tmdb/tv/${tvId}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      const totalEpisodes = data.number_of_episodes || 0;
      const averageRuntime =
        data.episode_run_time && data.episode_run_time.length > 0
          ? data.episode_run_time[0]
          : 45; // Default to 45 minutes if no runtime data

      return {
        runtime: totalEpisodes * averageRuntime,
        backdropPath: data.backdrop_path,
        numberOfEpisodes: totalEpisodes,
        numberOfSeasons: data.number_of_seasons || 0,
      };
    } catch (error) {
      console.error("Error fetching TV details:", error);
      return {
        runtime: 0,
        backdropPath: null,
        numberOfEpisodes: 0,
        numberOfSeasons: 0,
      };
    }
  };

  const getEpisodeDetails = async (tvId, numberOfSeasons) => {
    try {
      const seasons = [];

      for (let seasonNum = 1; seasonNum <= numberOfSeasons; seasonNum++) {
        const response = await fetch(
          `/api/tmdb/tv/${tvId}/season/${seasonNum}`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
          },
        );

        if (!response.ok) {
          console.error(
            `Failed to fetch season ${seasonNum}:`,
            response.status,
            response.statusText,
          );
          continue; // Skip this season and continue with next
        }

        const data = await response.json();

        const episodes =
          data.episodes?.map((ep) => ({
            episodeNumber: ep.episode_number,
            name: ep.name || `Episode ${ep.episode_number}`,
            voteAverage:
              ep.vote_average && ep.vote_average > 0 ? ep.vote_average : null,
          })) || [];

        seasons.push({
          seasonNumber: seasonNum,
          episodes,
        });
      }

      return seasons;
    } catch (error) {
      console.error("Error fetching episode details:", error);
      return [];
    }
  };

  const handleTVSeriesClick = async (tvSeries) => {
    if (tvSeries.type !== "tv") return;

    setLoadingEpisodes(true);
    try {
      const seasons = await getEpisodeDetails(
        tvSeries.id,
        tvSeries.numberOfSeasons || 0,
      );
      setShowEpisodeDetails({
        id: tvSeries.id,
        name: tvSeries.title,
        seasons,
      });
    } catch (error) {
      console.error("Error loading episode details:", error);
    } finally {
      setLoadingEpisodes(false);
    }
  };

  const getRatingColor = (rating) => {
    if (rating >= 9.0) return "bg-white"; // 9+ - white
    if (rating >= 8.0) return "bg-gray-300"; // 8 to 8.9 - light gray
    if (rating >= 7.0) return "bg-gray-600"; // 7 to 7.9 - medium gray
    return "bg-gray-900"; // below 6 - dark gray
  };

  const navigateSection = (section, direction) => {
    // Add scroll animation class to the section
    const sectionElement = document.querySelector(
      `[data-section="${section}"]`,
    );
    if (sectionElement) {
      sectionElement.style.transform =
        direction === "next" ? "translateX(-20px)" : "translateX(20px)";
      sectionElement.style.opacity = "0.8";
      sectionElement.style.transition = "all 0.3s ease-in-out";

      // Reset after animation
      setTimeout(() => {
        sectionElement.style.transform = "translateX(0)";
        sectionElement.style.opacity = "1";
      }, 300);
    }

    setCurrentPage((prev) => {
      const currentPageNum = prev[section];
      const itemsPerPage = 5;
      let newPage;

      if (direction === "next") {
        const totalPages = Math.ceil(
          getSectionData(section).filter(
            (item) =>
              item.poster &&
              item.poster.trim() !== "" &&
              item.poster !== "null" &&
              item.poster !== "undefined" &&
              item.poster.startsWith("http") &&
              !failedImages.has(item.poster),
          ).length / itemsPerPage,
        );
        newPage = currentPageNum + 1 >= totalPages ? 0 : currentPageNum + 1;
      } else {
        const totalPages = Math.ceil(
          getSectionData(section).filter(
            (item) =>
              item.poster &&
              item.poster.trim() !== "" &&
              item.poster !== "null" &&
              item.poster !== "undefined" &&
              item.poster.startsWith("http") &&
              !failedImages.has(item.poster),
          ).length / itemsPerPage,
        );
        newPage = currentPageNum - 1 < 0 ? totalPages - 1 : currentPageNum - 1;
      }

      return {
        ...prev,
        [section]: newPage,
      };
    });
  };

  const getSectionData = (section) => {
    switch (section) {
      case "netflix":
        return NETFLIX_TRENDING;
      case "prime":
        return AMAZON_PRIME_TRENDING;
      case "disney":
        return DISNEY_HOTSTAR_TRENDING;
      default:
        return [];
    }
  };

  const getPaginatedData = (section) => {
    const data = getSectionData(section).filter(
      (item) =>
        item.poster &&
        item.poster.trim() !== "" &&
        item.poster !== "null" &&
        item.poster !== "undefined" &&
        item.poster.startsWith("http") &&
        !failedImages.has(item.poster),
    );
    const itemsPerPage = 5;
    const startIndex = currentPage[section] * itemsPerPage;
    return data.slice(startIndex, startIndex + itemsPerPage);
  };

  const handleContentSelect = async (item) => {
    // Check if already selected
    if (
      selectedContent.some(
        (content) => content.id === item.id && content.type === item.type,
      )
    ) {
      return;
    }

    // Prevent rapid clicks
    if (isProcessing) return;

    setShowRecommendations(false);
    setSearchQuery("");
    setIsProcessing(true);

    try {
      let details;
      if (item.type === "movie") {
        details = await getMovieDetails(item.id);
      } else {
        details = await getTVDetails(item.id);
      }

      const totalMinutes = details.runtime;
      const days = Math.floor(totalMinutes / (24 * 60));
      const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
      const minutes = totalMinutes % 60;

      const selectedItem = {
        ...item,
        watchTime: {
          days,
          hours,
          minutes,
          totalMinutes,
        },
        backdropPath: details.backdropPath,
        poster: item.poster?.replace("w92", "w342"),
        numberOfEpisodes:
          item.type === "tv" ? details.numberOfEpisodes : undefined,
        numberOfSeasons:
          item.type === "tv" ? details.numberOfSeasons : undefined,
      };

      const newSelectedContent = [...selectedContent, selectedItem];
      setSelectedContent(newSelectedContent);
      calculateTotalWatchTime(newSelectedContent);
    } finally {
      setIsProcessing(false);
    }
  };

  const removeSelectedContent = (id, type) => {
    const newSelectedContent = selectedContent.filter(
      (content) => !(content.id === id && content.type === type),
    );
    setSelectedContent(newSelectedContent);
    calculateTotalWatchTime(newSelectedContent);
  };

  const searchMovies = async (query) => {
    if (!query.trim()) {
      setRecommendations([]);
      setShowRecommendations(false);
      return;
    }

    setIsSearching(true);

    try {
      const url = `/api/tmdb/search?query=${encodeURIComponent(query)}`;
      console.log("Fetching from backend URL:", url);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });

      console.log("Response status:", response.status);
      console.log("Response ok:", response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("TMDB API Error:", errorText);
        throw new Error(`TMDB API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log("TMDB Response data:", data);

      const formattedResults = data.results
        .filter(
          (item) =>
            (item.media_type === "movie" || item.media_type === "tv") &&
            item.vote_average &&
            item.vote_average > 0, // Only include items with IMDB ratings
        )
        .map((item) => ({
          id: item.id,
          title: item.media_type === "movie" ? item.title : item.name,
          year:
            item.media_type === "movie"
              ? item.release_date
                ? new Date(item.release_date).getFullYear().toString()
                : "N/A"
              : item.first_air_date
                ? new Date(item.first_air_date).getFullYear().toString()
                : "N/A",
          rating: item.vote_average
            ? parseFloat(item.vote_average.toFixed(1))
            : 0,
          poster: item.poster_path
            ? `${TMDB_IMAGE_BASE_URL}${item.poster_path}`
            : undefined,
          type: item.media_type === "movie" ? "movie" : "tv",
          overview: item.overview,
        }))
        .filter(
          (item) =>
            !selectedContent.some(
              (selected) =>
                selected.id === item.id && selected.type === item.type,
            ),
        ) // Filter out already selected content
        .slice(0, 5);

      setRecommendations(formattedResults);
      setShowRecommendations(true);
    } catch (error) {
      console.error("Error searching movies:", error);
      console.error("Error details:", {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });

      // Fallback search using static data when API fails
      const fallbackResults = [
        ...NETFLIX_TRENDING,
        ...AMAZON_PRIME_TRENDING,
        ...DISNEY_HOTSTAR_TRENDING,
      ]
        .filter(
          (item) =>
            item.title.toLowerCase().includes(query.toLowerCase()) ||
            (item.overview &&
              item.overview.toLowerCase().includes(query.toLowerCase())),
        )
        .slice(0, 5)
        .map((item) => ({
          ...item,
          overview:
            item.overview ||
            `${item.type === "tv" ? "TV Series" : "Movie"} from ${item.year}`,
        }));

      console.log("Using fallback search results:", fallbackResults);
      setRecommendations(fallbackResults);
      setShowRecommendations(true);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchMovies(searchQuery);
      setHighlightedIndex(-1); // Reset highlighted index when search changes
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleKeyDown = (e) => {
    if (!showRecommendations || recommendations.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < recommendations.length - 1 ? prev + 1 : 0,
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : recommendations.length - 1,
        );
        break;
      case "Enter":
        e.preventDefault();
        if (
          highlightedIndex >= 0 &&
          highlightedIndex < recommendations.length
        ) {
          handleContentSelect(recommendations[highlightedIndex]);
        }
        break;
      case "Escape":
        setShowRecommendations(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  const handleShare = async () => {
    const url = window.location.href;

    try {
      // Try modern Clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
        alert("Website URL copied to clipboard!");
        return;
      }
    } catch (error) {
      console.log("Clipboard API failed, trying fallback method");
    }

    // Fallback method using temporary textarea
    try {
      const textArea = document.createElement("textarea");
      textArea.value = url;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      const successful = document.execCommand("copy");
      document.body.removeChild(textArea);

      if (successful) {
        alert("Website URL copied to clipboard!");
      } else {
        throw new Error("Copy command failed");
      }
    } catch (error) {
      console.error("All copy methods failed:", error);
      // Final fallback - show URL in a prompt for manual copy
      prompt("Copy this URL manually:", url);
    }
  };

  // Get the latest selected content for background
  const latestContent = selectedContent[selectedContent.length - 1];
  const backgroundImage = latestContent?.backdropPath
    ? `${TMDB_BACKDROP_BASE_URL}${latestContent.backdropPath}`
    : null;

  return (
    <div
      className="min-h-screen relative touch-manipulation"
      style={{ touchAction: "manipulation" }}
    >
      {/* Background Image */}
      {backgroundImage ? (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${backgroundImage})` }}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
        </div>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-800 to-white"></div>
      )}

      {/* Main Content */}
      <div className="relative z-10 container mx-auto px-4 py-16 transition-all duration-500 ease-in-out flex flex-col justify-start items-start">
        <div className="text-center space-y-8 max-w-4xl mx-auto transition-all duration-500 ease-in-out">
          {!selectedContent.length ? (
            <>
              {/* Brand Logo/Icon */}
              <div className="flex justify-center">
                <div className="relative transform hover:scale-105 transition-transform duration-300 ease-in-out">
                  <div className="absolute inset-0 bg-gradient-to-r from-gray-600 to-gray-400 rounded-full blur-xl opacity-30 scale-110 transition-opacity duration-300"></div>
                  <div className="relative bg-gradient-to-r from-gray-700 to-gray-500 p-4 rounded-full transition-all duration-300 ease-in-out hover:from-gray-600 hover:to-gray-400">
                    <Film className="w-8 h-8 text-white transition-transform duration-300 ease-in-out" />
                  </div>
                </div>
              </div>

              {/* Main Heading */}
              <div className="space-y-4">
                <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
                  onlyseriesto.watch
                </h1>
                <p className="text-xl sm:text-2xl text-gray-300 max-w-3xl mx-auto">
                  Your ultimate guide to how long it takes to watch every show
                  and movie.
                </p>
              </div>
            </>
          ) : (
            /* Large Clock Display */
            <div className="space-y-6 transition-all duration-500 ease-in-out">
              <div className="flex justify-center">
                <div className="relative transform hover:scale-105 transition-transform duration-300 ease-in-out">
                  <div className="absolute inset-0 bg-gradient-to-r from-gray-600 to-gray-400 rounded-full blur-xl opacity-30 scale-110 transition-opacity duration-300"></div>
                  <div className="relative bg-gradient-to-r from-gray-700 to-gray-500 p-3 rounded-full transition-all duration-300 ease-in-out hover:from-gray-600 hover:to-gray-400">
                    <Clock className="w-6 h-6 text-white transition-transform duration-300 ease-in-out" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div
                  className={`text-6xl sm:text-8xl lg:text-9xl font-bold text-white font-mono tracking-wider transition-all duration-300 ease-in-out hover:scale-105 relative ${isCountingAnimation ? "animate-pulse scale-105" : ""}`}
                >
                  <span
                    className={`inline-block transition-all duration-200 ease-out ${isCountingAnimation ? "text-gray-300" : "text-white"}`}
                  >
                    {String(animatedWatchTime.days).padStart(2, "0")}
                  </span>
                  <span className="text-gray-400 mx-2">:</span>
                  <span
                    className={`inline-block transition-all duration-200 ease-out ${isCountingAnimation ? "text-gray-300" : "text-white"}`}
                  >
                    {String(animatedWatchTime.hours).padStart(2, "0")}
                  </span>
                  <span className="text-gray-400 mx-2">:</span>
                  <span
                    className={`inline-block transition-all duration-200 ease-out ${isCountingAnimation ? "text-gray-300" : "text-white"}`}
                  >
                    {String(animatedWatchTime.minutes).padStart(2, "0")}
                  </span>
                </div>
                <div className="flex justify-center space-x-8 text-gray-300 transition-all duration-300 ease-in-out">
                  <div className="text-center hover:text-white transition-colors duration-200">
                    <div className="text-sm font-medium">DAYS</div>
                  </div>
                  <div className="text-center hover:text-white transition-colors duration-200">
                    <div className="text-sm font-medium">HOURS</div>
                  </div>
                  <div className="text-center hover:text-white transition-colors duration-200">
                    <div className="text-sm font-medium">MINUTES</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Search Section */}
          <div className="max-w-2xl mx-auto relative transition-all duration-500 ease-in-out">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-gray-600/20 to-gray-400/20 rounded-lg blur-xl transition-opacity duration-300"></div>
              <div className="relative bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-lg p-1 transition-all duration-300 ease-in-out hover:border-gray-600/70">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  {isSearching && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                  <Input
                    type="text"
                    placeholder="Search for movies, web series, shows..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => searchQuery && setShowRecommendations(true)}
                    onBlur={() =>
                      setTimeout(() => {
                        setShowRecommendations(false);
                        setHighlightedIndex(-1);
                      }, 200)
                    }
                    onTouchStart={() =>
                      searchQuery && setShowRecommendations(true)
                    }
                    className="pl-10 pr-12 py-4 bg-transparent border-0 text-white placeholder-gray-400 focus:ring-2 focus:ring-gray-500/50 text-lg w-full touch-manipulation"
                    style={{ touchAction: "manipulation" }}
                    autoComplete="off"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck="false"
                  />
                </div>
              </div>
            </div>

            {/* Recommendations Dropdown */}
            {showRecommendations && recommendations.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800/95 backdrop-blur-sm border border-gray-700/50 rounded-lg shadow-xl z-50 max-h-80 overflow-y-auto scrollbar-hide transition-all duration-300 ease-in-out animate-in slide-in-from-top-2">
                {recommendations.map((item, index) => (
                  <div
                    key={item.id}
                    className={`px-4 py-3 cursor-pointer border-b border-gray-700/30 last:border-b-0 transition-all duration-200 ease-in-out transform hover:scale-[1.02] active:scale-[0.98] touch-manipulation touch-feedback touch-target ${
                      index === highlightedIndex
                        ? "bg-gray-600/70 shadow-md"
                        : "hover:bg-gray-700/50 active:bg-gray-700/70"
                    }`}
                    onClick={() => handleContentSelect(item)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onTouchStart={() => setHighlightedIndex(index)}
                    onTouchEnd={() => handleContentInteraction(item)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 flex-1">
                        <div className="w-12 h-16 bg-gray-700 rounded-md flex items-center justify-center overflow-hidden flex-shrink-0">
                          {item.poster ? (
                            <img
                              src={item.poster}
                              alt={item.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Film className="w-6 h-6 text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-white font-medium truncate">
                            {item.title}
                          </h3>
                          <div className="flex items-center space-x-2 text-sm text-gray-400">
                            <Calendar className="w-3 h-3 flex-shrink-0" />
                            <span>{item.year}</span>
                            <span>•</span>
                            <span className="capitalize">
                              {item.type === "tv" ? "TV Series" : "Movie"}
                            </span>
                          </div>
                        </div>
                      </div>
                      {item.rating > 0 && (
                        <div className="flex items-center space-x-1 text-gray-400 flex-shrink-0 ml-2">
                          <Star className="w-4 h-4 fill-current" />
                          <span className="text-sm font-medium">
                            {item.rating}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* No results message */}
            {showRecommendations &&
              searchQuery &&
              recommendations.length === 0 &&
              !isSearching && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800/95 backdrop-blur-sm border border-gray-700/50 rounded-lg shadow-xl z-50 p-4 transition-all duration-300 ease-in-out animate-in slide-in-from-top-2">
                  <div className="text-center text-gray-400">
                    <Film className="w-8 h-8 mx-auto mb-2 opacity-50 transition-opacity duration-300" />
                    <p className="transition-all duration-300">
                      No movies or series found for "{searchQuery}"
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      Check your internet connection or try again later
                    </p>
                  </div>
                </div>
              )}
          </div>

          {/* Selected Content Cards Grid - Hover Only Details */}
          {selectedContent.length > 0 && (
            <div className="mt-12 transition-all duration-500 ease-in-out">
              <div className="flex flex-wrap justify-center gap-4">
                {selectedContent.map((content, index) => (
                  <div
                    key={`${content.type}-${content.id}`}
                    className="relative group w-48 flex-shrink-0"
                    style={{
                      animation: `fadeInUp 0.6s ease-out forwards ${index * 100}ms`,
                    }}
                  >
                    <div
                      className={`relative bg-gray-800/80 backdrop-blur-sm border border-gray-700/50 rounded-lg overflow-hidden hover:bg-gray-700/80 transition-all duration-300 ease-in-out shadow-lg aspect-[2/3] transform hover:scale-105 hover:shadow-2xl hover:border-gray-600/70 touch-manipulation touch-feedback touch-select-none ${content.type === "tv" ? "cursor-pointer" : ""}`}
                      onClick={() =>
                        content.type === "tv" && handleTVSeriesClick(content)
                      }
                      onTouchStart={handleTouchStart}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                    >
                      {/* Remove Button */}
                      <button
                        onClick={(e) =>
                          handleRemoveInteraction(e, content.id, content.type)
                        }
                        onTouchStart={(e) => e.stopPropagation()}
                        onTouchEnd={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                        }}
                        className="absolute top-2 right-2 z-20 bg-black/70 hover:bg-red-600 active:bg-red-700 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200 touch-manipulation touch-feedback touch-target shadow-md hover:shadow-lg"
                      >
                        <X className="w-4 h-4" />
                      </button>

                      {/* Poster - Always Visible */}
                      <div className="absolute inset-0">
                        {content.poster ? (
                          <img
                            src={content.poster}
                            alt={content.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-700">
                            <Film className="w-12 h-12 text-gray-400" />
                          </div>
                        )}
                      </div>

                      {/* Hover Overlay with Details */}
                      <div className="absolute inset-0 bg-black/85 opacity-0 group-hover:opacity-100 transition-all duration-300 ease-in-out flex flex-col justify-center p-4 z-10">
                        <div className="space-y-3">
                          {/* Name */}
                          <div className="flex items-center space-x-2 text-white">
                            <Type className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span className="font-medium text-sm leading-tight">
                              {content.title}
                            </span>
                          </div>

                          {/* TV Show Details */}
                          {content.type === "tv" && (
                            <>
                              {/* Seasons */}
                              {content.numberOfSeasons && (
                                <div className="flex items-center space-x-2 text-gray-300">
                                  <Layers className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                  <span className="text-sm">
                                    {content.numberOfSeasons} Season
                                    {content.numberOfSeasons > 1 ? "s" : ""}
                                  </span>
                                </div>
                              )}

                              {/* Episodes */}
                              {content.numberOfEpisodes && (
                                <div className="flex items-center space-x-2 text-gray-300">
                                  <Play className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                  <span className="text-sm">
                                    {content.numberOfEpisodes} Episode
                                    {content.numberOfEpisodes > 1 ? "s" : ""}
                                  </span>
                                </div>
                              )}
                            </>
                          )}

                          {/* IMDB Rating */}
                          {content.rating > 0 && (
                            <div className="flex items-center space-x-2 text-gray-300">
                              <Star className="w-4 h-4 text-gray-400 fill-current flex-shrink-0" />
                              <span className="text-sm">
                                {content.rating} IMDB
                              </span>
                            </div>
                          )}

                          {/* Total Watch Time */}
                          <div className="flex items-center space-x-2 text-gray-300">
                            <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span className="text-sm">
                              {content.watchTime.days > 0 &&
                                `${content.watchTime.days}d`}
                              {content.watchTime.hours > 0 &&
                                `${content.watchTime.hours}h`}
                              {content.watchTime.minutes > 0 &&
                                `${content.watchTime.minutes}m`}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Floating Share Button */}
        <Button
          onClick={handleShare}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-r from-gray-700 to-gray-500 hover:from-gray-800 hover:to-gray-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out transform hover:scale-110 z-50 flex items-center justify-center"
          size="icon"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-6 h-6 transition-transform duration-300 ease-in-out"
          >
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" x2="15.42" y1="13.51" y2="17.49" />
            <line x1="15.41" x2="8.59" y1="6.51" y2="10.49" />
          </svg>
        </Button>
      </div>

      {/* Episode Details Modal */}
      {showEpisodeDetails && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-700/50 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700/50">
              <h2 className="text-2xl font-bold text-white">
                {showEpisodeDetails.name} - Episode Ratings (IMDB)
              </h2>
              <button
                onClick={() => setShowEpisodeDetails(null)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Loading State */}
            {loadingEpisodes ? (
              <div className="flex items-center justify-center p-12">
                <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span className="ml-3 text-white">Loading episodes...</span>
              </div>
            ) : (
              <>
                {/* Rating Source Notice */}
                <div className="px-6 py-2 bg-gray-800/50 border-b border-gray-700/30">
                  <p className="text-sm text-gray-400 text-center">
                    Ratings are from TMDB (The Movie Database). Episodes with
                    "—" have insufficient votes on TMDB.
                  </p>
                </div>
                {/* Episode Grid */}
                <div className="p-6 overflow-auto max-h-[calc(90vh-120px)]">
                  {(() => {
                    const maxEpisodes = Math.max(
                      ...showEpisodeDetails.seasons.map(
                        (s) => s.episodes.length,
                      ),
                    );
                    const maxSeasons = showEpisodeDetails.seasons.length;

                    return (
                      <div className="inline-block">
                        {/* Header Row - Season Numbers */}
                        <div
                          className="grid gap-1 mb-1"
                          style={{
                            gridTemplateColumns: `40px repeat(${maxSeasons}, 50px)`,
                          }}
                        >
                          <div></div> {/* Empty corner */}
                          {showEpisodeDetails.seasons.map((season) => (
                            <div
                              key={season.seasonNumber}
                              className="flex items-center justify-center text-gray-400 font-medium text-sm bg-gray-700 rounded p-2"
                            >
                              {season.seasonNumber}
                            </div>
                          ))}
                        </div>

                        {/* Episode Rows */}
                        {Array.from(
                          { length: maxEpisodes },
                          (_, episodeIndex) => (
                            <div
                              key={episodeIndex + 1}
                              className="grid gap-1 mb-1"
                              style={{
                                gridTemplateColumns: `40px repeat(${maxSeasons}, 50px)`,
                              }}
                            >
                              {/* Episode Number */}
                              <div className="flex items-center justify-center text-gray-400 font-medium text-sm bg-gray-700 rounded p-2">
                                {episodeIndex + 1}
                              </div>

                              {/* Episode Ratings for Each Season */}
                              {showEpisodeDetails.seasons.map((season) => {
                                const episode = season.episodes[episodeIndex];
                                return (
                                  <div
                                    key={season.seasonNumber}
                                    className="relative group"
                                  >
                                    {episode ? (
                                      <>
                                        <div
                                          className={`w-12 h-12 ${episode.voteAverage ? getRatingColor(episode.voteAverage) : "bg-gray-500"} rounded flex items-center justify-center ${episode.voteAverage && episode.voteAverage >= 8.0 ? "text-black" : "text-white"} font-bold text-xs cursor-pointer hover:scale-110 transition-transform duration-200 shadow-lg`}
                                        >
                                          {episode.voteAverage
                                            ? episode.voteAverage.toFixed(1)
                                            : "—"}
                                        </div>

                                        {/* Tooltip */}
                                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black/90 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                                          {episode.name}
                                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-black/90"></div>
                                        </div>
                                      </>
                                    ) : (
                                      <div className="w-12 h-12 bg-gray-600/50 rounded flex items-center justify-center text-gray-500 text-xs">
                                        —
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ),
                        )}
                      </div>
                    );
                  })()}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
