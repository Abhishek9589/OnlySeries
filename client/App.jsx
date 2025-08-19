import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index";

const App = () => (
  <TooltipProvider>
    <Toaster />
    <Sonner />
    <Index />
  </TooltipProvider>
);

createRoot(document.getElementById("root")).render(<App />);
