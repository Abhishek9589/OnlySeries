import { WifiOff, Wifi } from 'lucide-react';
import { useOffline } from '../hooks/use-offline';
import { useState, useEffect } from 'react';

export default function OfflineBanner() {
  const isOffline = useOffline();
  const [showReconnected, setShowReconnected] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (isOffline) {
      setWasOffline(true);
      setShowReconnected(false);
    } else if (wasOffline) {
      setShowReconnected(true);
      // Hide the "reconnected" message after 3 seconds
      const timer = setTimeout(() => {
        setShowReconnected(false);
        setWasOffline(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOffline, wasOffline]);

  if (!isOffline && !showReconnected) {
    return null;
  }

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 px-4 py-3 text-center text-sm font-medium transition-colors ${
        isOffline
          ? 'bg-destructive text-destructive-foreground'
          : 'bg-green-600 text-white'
      }`}
    >
      <div className="flex items-center justify-center gap-2">
        {isOffline ? (
          <>
            <WifiOff size={16} />
            <span>You're offline - Search and new content unavailable</span>
          </>
        ) : (
          <>
            <Wifi size={16} />
            <span>Back online! Search is now available</span>
          </>
        )}
      </div>
    </div>
  );
}
