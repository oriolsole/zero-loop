
import { useToast as useSonnerToast, toast as sonnerToast } from "sonner";

// Use Sonner toast instead of the custom implementation to prevent duplicates
export const useToast = useSonnerToast;
export const toast = sonnerToast;
