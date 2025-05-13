
/**
 * Check if a string is a valid UUID
 */
export function isValidUUID(id: string): boolean {
  if (!id) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Ensures a domain ID is never empty and is a valid UUID
 * @param domainId The domain ID to validate
 * @returns The domain ID if valid, otherwise undefined
 */
export function validateDomainId(domainId: string | undefined | null): string | undefined {
  if (!domainId || domainId === '' || domainId === 'no-domain') {
    return undefined;
  }
  
  if (!isValidUUID(domainId)) {
    console.warn(`Invalid domain ID format: ${domainId}`);
    return undefined;
  }
  
  return domainId;
}
