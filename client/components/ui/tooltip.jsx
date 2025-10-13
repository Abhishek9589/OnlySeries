import * as React from "react";

// Simple tooltip provider that just renders children
const TooltipProvider = ({ children, ...props }) => {
  return <>{children}</>;
};

export { TooltipProvider };
