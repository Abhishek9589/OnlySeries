import { useState } from 'react';
import { Film, Tv, ImageOff } from 'lucide-react';
import { motion } from 'framer-motion';

export default function FallbackImage({ 
  src, 
  alt, 
  type = 'movie', 
  className = '',
  fallbackClassName = ''
}) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
  };

  const handleLoad = () => {
    setIsLoading(false);
  };

  if (hasError || !src) {
    return (
      <div className={`bg-gray-blue/50 border-2 border-dashed border-gray-blue/70 flex flex-col items-center justify-center text-muted-foreground ${fallbackClassName || className}`}>
        {type === 'movie' ? (
          <Film size={48} className="mb-2 opacity-50" />
        ) : type === 'tv' ? (
          <Tv size={48} className="mb-2 opacity-50" />
        ) : (
          <ImageOff size={48} className="mb-2 opacity-50" />
        )}
        <span className="text-sm text-center px-2">
          {alt || 'No Image Available'}
        </span>
      </div>
    );
  }

  return (
    <div className="relative">
      {isLoading && (
        <div className={`absolute inset-0 bg-gray-blue/30 animate-pulse pointer-events-none ${className}`}>
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-2 border-ring border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
      )}
      <motion.img
        src={src}
        alt={alt}
        className={className}
        onError={handleError}
        onLoad={handleLoad}
        loading="lazy"
        decoding="async"
        initial={{ opacity: 0 }}
        animate={{ opacity: isLoading ? 0 : 1 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        style={{ display: hasError ? 'none' : 'block' }}
      />
    </div>
  );
}
