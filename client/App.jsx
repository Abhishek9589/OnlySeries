import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import Index from "./pages/Index";

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
      <Index />
    </TooltipProvider>
  );
};

createRoot(document.getElementById("root")).render(<App />);
