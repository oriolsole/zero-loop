
import { v4 as uuidv4 } from 'uuid';
import { Domain } from '@/types/intelligence';

/**
 * Ensures a domain ID is never empty
 */
export function ensureSafeDomainId(domainId: string | undefined | null, fallback: string = 'no-domain'): string {
  if (!domainId || domainId === '') {
    return fallback;
  }
  return domainId;
}

/**
 * Check if a string is a valid UUID
 */
export function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Filters out domains with invalid IDs
 */
export function filterValidDomains(domains: Domain[]): Domain[] {
  return domains.filter(domain => domain.id && domain.id.trim() !== '');
}

/**
 * Ensures domain has a valid ID by generating one if necessary
 */
export function ensureValidDomainId(domain: Domain): Domain {
  if (!domain.id || domain.id.trim() === '') {
    return {
      ...domain,
      id: uuidv4()
    };
  }
  return domain;
}

/**
 * Safely processes a domain ID for database operations
 * Returns undefined for 'no-domain', valid UUID otherwise
 */
export function processDomainId(domainId: string | undefined | null): string | undefined {
  if (!domainId || domainId === 'no-domain') {
    return undefined;
  }
  
  return isValidUUID(domainId) ? domainId : undefined;
}
