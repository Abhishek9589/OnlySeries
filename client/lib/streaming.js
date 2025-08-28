// Mock streaming availability data
// In a real app, this would call a streaming availability API like JustWatch API

const streamingPlatforms = {
  netflix: { name: "Netflix", color: "#e50914", icon: "🎬" },
  prime: { name: "Prime Video", color: "#00a8e1", icon: "📺" },
  hulu: { name: "Hulu", color: "#1ce783", icon: "🟢" },
  disney: { name: "Disney+", color: "#113ccf", icon: "🏰" },
  hbo: { name: "HBO Max", color: "#8a2be2", icon: "🎭" },
  apple: { name: "Apple TV+", color: "#000000", icon: "🍎" },
  paramount: { name: "Paramount+", color: "#0064ff", icon: "⭐" },
  peacock: { name: "Peacock", color: "#fa6400", icon: "🦚" },
  showtime: { name: "Showtime", color: "#ff0000", icon: "🎪" },
  starz: { name: "Starz", color: "#000000", icon: "⭐" },
  crunchyroll: { name: "Crunchyroll", color: "#ff6500", icon: "🈯" },
  youtube: { name: "YouTube", color: "#ff0000", icon: "📹" },
};

// Mock data for popular movies/shows - in real app this would come from API
const mockStreamingData = {
  // Popular Marvel movies
  299536: ["disney"], // Avengers: Infinity War
  299534: ["disney"], // Avengers: Endgame
  284054: ["disney"], // Black Panther
  1726: ["disney"], // Iron Man
  10195: ["disney"], // Thor
  1771: ["disney"], // Captain America: The First Avenger
  
  // Popular TV shows
  1399: ["hbo"], // Game of Thrones
  60735: ["netflix"], // The Flash
  1668: ["netflix"], // Friends
  46952: ["netflix"], // The Walking Dead
  1402: ["netflix"], // The Walking Dead
  71912: ["netflix"], // The Witcher
  85552: ["netflix"], // Euphoria (actually HBO but for demo)
  
  // Popular movies
  550: ["netflix", "hulu"], // Fight Club
  13: ["prime"], // Forrest Gump
  278: ["netflix"], // The Shawshank Redemption
  238: ["prime"], // The Godfather
  424: ["netflix"], // Schindler's List
};

export const getStreamingAvailability = async (tmdbId, title, type) => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Check if we have mock data for this ID
  if (mockStreamingData[tmdbId]) {
    return mockStreamingData[tmdbId];
  }
  
  // For items not in our mock data, randomly assign 1-3 platforms
  // This simulates real-world availability
  const platformKeys = Object.keys(streamingPlatforms);
  const numPlatforms = Math.floor(Math.random() * 3) + 1; // 1-3 platforms
  const selectedPlatforms = [];
  
  for (let i = 0; i < numPlatforms; i++) {
    const randomPlatform = platformKeys[Math.floor(Math.random() * platformKeys.length)];
    if (!selectedPlatforms.includes(randomPlatform)) {
      selectedPlatforms.push(randomPlatform);
    }
  }
  
  return selectedPlatforms;
};

export const getPlatformInfo = (platformKey) => {
  return streamingPlatforms[platformKey] || null;
};

export const getAllPlatforms = () => {
  return streamingPlatforms;
};
