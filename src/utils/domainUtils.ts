
import { v4 as uuidv4 } from 'uuid';
import { isValidUUID } from './supabase/helpers';
import { Domain } from '../types/intelligence';

/**
 * Ensures a domain ID is never empty
 * @param domainId The domain ID to validate
 * @param fallback Optional fallback value (defaults to 'no-domain')
 * @returns A safe domain ID that is never an empty string
 */
export function ensureSafeDomainId(domainId: string | undefined | null, fallback: string = 'no-domain'): string {
  if (!domainId || domainId === '') {
    return fallback;
  }
  return domainId;
}

/**
 * Filters out domains with invalid IDs
 * @param domains Array of domains
 * @returns Filtered array with only valid domains
 */
export function filterValidDomains(domains: Domain[]): Domain[] {
  return domains.filter(domain => domain.id && domain.id.trim() !== '');
}

/**
 * Ensures domain has a valid ID by generating one if necessary
 * @param domain Domain object
 * @returns Domain with guaranteed valid ID
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
