import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import React, { useEffect } from "react";
import Index from "./pages/Index";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('App render error:', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
        <div className="max-w-md w-full bg-card/90 border border-border rounded-xl p-4 text-center">
          <div className="font-semibold mb-2">Something went wrong</div>
          <div className="text-sm text-muted-foreground mb-4">Try refreshing or resetting the UI.</div>
          <div className="flex gap-2 justify-center">
            <button onClick={() => window.location.reload()} className="px-3 py-2 rounded-md bg-primary text-primary-foreground">Refresh</button>
            <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="px-3 py-2 rounded-md bg-card border border-border">Reset</button>
          </div>
        </div>
      </div>
    );
  }
}

const App = () => {
  useEffect(() => {
    const cleanup = () => {
      try {
        const prev = document.body.dataset._prevOverflow || '';
        document.body.style.overflow = prev;
        delete document.body.dataset._prevOverflow;
      } catch {}
      try {
        window.dispatchEvent(new CustomEvent('close-search-results'));
      } catch {}
    };

    const onError = () => cleanup();
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onError);
    window.addEventListener('app:reset-ui', cleanup);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onError);
      window.removeEventListener('app:reset-ui', cleanup);
    };
  }, []);

  return (
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <ErrorBoundary>
        <Index />
      </ErrorBoundary>
    </TooltipProvider>
  );
};

createRoot(document.getElementById("root")).render(<App />);
