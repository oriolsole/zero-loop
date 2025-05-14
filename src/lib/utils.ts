
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(input: string | number | Date | undefined | null): string | null {
  if (!input) return null
  
  try {
    const date = new Date(input)
    return format(date, 'MMM d, yyyy')
  } catch (e) {
    return input?.toString() || null
  }
}

// Returns a shortened version of text with ellipsis
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

// Safely parse JSON or return null
export function safeJsonParse<T>(json: string): T | null {
  try {
    return JSON.parse(json) as T
  } catch (e) {
    return null
  }
}
