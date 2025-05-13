
/**
 * Ensures a domain ID is never an empty string
 */
export const ensureSafeDomainId = (domainId?: string | null): string => {
  if (!domainId || domainId.trim() === '') {
    return 'no-domain';
  }
  return domainId;
};

/**
 * Filters out any domains with empty IDs
 */
export interface Domain {
  id: string;
  name: string;
  [key: string]: any;
}

export const filterValidDomains = (domains: Domain[]): Domain[] => {
  return domains.filter(domain => domain.id && domain.id.trim() !== '');
};
