
// We're using sonner now, so this component can be removed in favor of sonner.tsx
// This file is kept for compatibility with existing code that imports from here

import { Toaster as SonnerToaster } from "./sonner";

export function Toaster() {
  return <SonnerToaster />;
}
