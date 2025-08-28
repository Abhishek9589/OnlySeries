import React from "react";

const StreamingPlatforms = ({ platforms }) => {
  if (!platforms || platforms.length === 0) {
    return null;
  }

  const getPlatformLogo = (platformName) => {
    const iconPaths = {
      "netflix": "/icons/platforms/netflix.png",
      "prime video": "/icons/platforms/prime.png",
      "hulu": "/icons/platforms/hulu.png",
      "disney+": "/icons/platforms/disney.png",
      "hbo max": "/icons/platforms/hbo.png",
      "apple tv+": "/icons/platforms/apple.png",
      "paramount+": "/icons/platforms/paramount.png",
      "peacock": "/icons/platforms/peacock.png",
      "showtime": "/icons/platforms/showtime.png",
      "starz": "/icons/platforms/starz.png",
      "crunchyroll": "/icons/platforms/crunchyroll.png",
      "youtube": "/icons/platforms/youtube.png"
    };

    const platformColors = {
      "netflix": "#e50914",
      "prime video": "#00a8e1",
      "hulu": "#1ce783",
      "disney+": "#113ccf",
      "hbo max": "#8a2be2",
      "apple tv+": "#000000",
      "paramount+": "#0064ff",
      "peacock": "#fa6400",
      "showtime": "#ff0000",
      "starz": "#000000",
      "crunchyroll": "#ff6500",
      "youtube": "#ff0000"
    };

    const key = platformName.toLowerCase();
    const iconPath = iconPaths[key];
    const bgColor = platformColors[key] || "#6b7280";

    return (
      <div
        className="flex items-center gap-2 text-white px-3 py-2 rounded-lg"
        style={{ backgroundColor: bgColor }}
      >
        {iconPath ? (
          <img
            src={iconPath}
            alt={platformName}
            className="w-5 h-5 object-contain"
          />
        ) : (
          <div className="w-5 h-5 bg-gray-400 rounded"></div>
        )}
        <span className="text-sm font-medium">{platformName}</span>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {platforms.map((platform, index) => (
          <div key={index}>
            {getPlatformLogo(platform.name)}
          </div>
        ))}
      </div>
    </div>
  );
};

export default StreamingPlatforms;
