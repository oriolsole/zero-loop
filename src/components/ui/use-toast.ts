
// The sonner library doesn't have a useToast export
// It only exports the toast function and some related features
// Let's update our implementation to use what's actually available

import { toast } from "sonner";

// Create our own useToast hook that wraps the toast function
export const useToast = () => {
  return { toast };
};

// Re-export the toast function for direct usage
export { toast };
