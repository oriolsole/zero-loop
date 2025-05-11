
import { v4 as uuidv4 } from 'uuid';

/**
 * Check if a string is a valid UUID
 */
export function isValidUUID(id: string): boolean {
  if (!id) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Safe deep clone and stringify for JSON serialization
 * Used to prepare objects for Supabase JSON columns
 */
export function safeJsonSerialize(obj: any): any {
  return JSON.parse(JSON.stringify(obj));
}
