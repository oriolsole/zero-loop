
/**
 * Google API scopes for different services
 */

export interface GoogleScope {
  id: string;
  name: string;
  description: string;
  scope: string;
  required: boolean;
}

export const GOOGLE_SCOPES: GoogleScope[] = [
  // Basic Account Information (always required)
  {
    id: 'userinfo-email',
    name: 'Email Address',
    description: 'Access to your email address',
    scope: 'https://www.googleapis.com/auth/userinfo.email',
    required: true
  },
  {
    id: 'userinfo-profile',
    name: 'Basic Profile',
    description: 'Access to your basic profile information',
    scope: 'https://www.googleapis.com/auth/userinfo.profile',
    required: true
  },
  
  // Google Drive
  {
    id: 'drive',
    name: 'Google Drive',
    description: 'Full access to Google Drive files and folders',
    scope: 'https://www.googleapis.com/auth/drive',
    required: false
  },
  
  // Gmail
  {
    id: 'gmail',
    name: 'Gmail',
    description: 'Full access to Gmail (read, send, modify emails)',
    scope: 'https://www.googleapis.com/auth/gmail.modify',
    required: false
  },
  {
    id: 'gmail-readonly',
    name: 'Gmail (Read Only)',
    description: 'Read-only access to Gmail',
    scope: 'https://www.googleapis.com/auth/gmail.readonly',
    required: false
  },
  {
    id: 'gmail-send',
    name: 'Gmail Send',
    description: 'Permission to send emails via Gmail',
    scope: 'https://www.googleapis.com/auth/gmail.send',
    required: false
  },
  
  // Google Calendar
  {
    id: 'calendar',
    name: 'Google Calendar',
    description: 'Full access to Google Calendar',
    scope: 'https://www.googleapis.com/auth/calendar',
    required: false
  },
  {
    id: 'calendar-readonly',
    name: 'Google Calendar (Read Only)',
    description: 'Read-only access to Google Calendar',
    scope: 'https://www.googleapis.com/auth/calendar.readonly',
    required: false
  },
  
  // Google Sheets
  {
    id: 'spreadsheets',
    name: 'Google Sheets',
    description: 'Full access to Google Sheets',
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    required: false
  },
  
  // Google Docs
  {
    id: 'documents',
    name: 'Google Docs',
    description: 'Full access to Google Docs',
    scope: 'https://www.googleapis.com/auth/documents',
    required: false
  },
  
  // Google Contacts
  {
    id: 'contacts',
    name: 'Google Contacts',
    description: 'Full access to Google Contacts',
    scope: 'https://www.googleapis.com/auth/contacts',
    required: false
  },
  {
    id: 'contacts-readonly',
    name: 'Google Contacts (Read Only)',
    description: 'Read-only access to Google Contacts',
    scope: 'https://www.googleapis.com/auth/contacts.readonly',
    required: false
  },
  
  // Google Photos
  {
    id: 'photoslibrary',
    name: 'Google Photos',
    description: 'Access to Google Photos library',
    scope: 'https://www.googleapis.com/auth/photoslibrary.readonly',
    required: false
  },
  
  // YouTube
  {
    id: 'youtube',
    name: 'YouTube',
    description: 'Read-only access to YouTube data',
    scope: 'https://www.googleapis.com/auth/youtube.readonly',
    required: false
  }
];

export const GOOGLE_SERVICES = {
  'google-account': {
    name: 'Google Account',
    requiredScopes: ['userinfo-email', 'userinfo-profile'],
    icon: 'google-account'
  },
  'google-drive': {
    name: 'Google Drive',
    requiredScopes: ['drive'],
    icon: 'google-drive'
  },
  'gmail': {
    name: 'Gmail',
    requiredScopes: ['gmail'],
    icon: 'gmail'
  },
  'google-calendar': {
    name: 'Google Calendar',
    requiredScopes: ['calendar'],
    icon: 'google-calendar'
  },
  'google-sheets': {
    name: 'Google Sheets',
    requiredScopes: ['spreadsheets'],
    icon: 'google-sheets'
  },
  'google-docs': {
    name: 'Google Docs',
    requiredScopes: ['documents'],
    icon: 'google-docs'
  },
  'google-contacts': {
    name: 'Google Contacts',
    requiredScopes: ['contacts'],
    icon: 'google-contacts'
  },
  'google-photos': {
    name: 'Google Photos',
    requiredScopes: ['photoslibrary'],
    icon: 'google-photos'
  },
  'youtube': {
    name: 'YouTube',
    requiredScopes: ['youtube'],
    icon: 'youtube'
  }
} as const;

/**
 * Get all available scopes
 */
export function getAllScopes(): string[] {
  return GOOGLE_SCOPES.map(scope => scope.scope);
}

/**
 * Get required scopes (always needed)
 */
export function getRequiredScopes(): string[] {
  return GOOGLE_SCOPES
    .filter(scope => scope.required)
    .map(scope => scope.scope);
}

/**
 * Get scopes for specific services
 */
export function getScopesForServices(serviceIds: string[]): string[] {
  const scopes = new Set<string>();
  
  // Always include required scopes
  getRequiredScopes().forEach(scope => scopes.add(scope));
  
  // Add service-specific scopes
  serviceIds.forEach(serviceId => {
    const service = GOOGLE_SERVICES[serviceId as keyof typeof GOOGLE_SERVICES];
    if (service) {
      service.requiredScopes.forEach(scopeId => {
        const scope = GOOGLE_SCOPES.find(s => s.id === scopeId);
        if (scope) {
          scopes.add(scope.scope);
        }
      });
    }
  });
  
  return Array.from(scopes);
}

/**
 * Get scope by ID
 */
export function getScopeById(id: string): GoogleScope | undefined {
  return GOOGLE_SCOPES.find(scope => scope.id === id);
}

/**
 * Check if a scope is required
 */
export function isScopeRequired(scopeId: string): boolean {
  const scope = getScopeById(scopeId);
  return scope?.required || false;
}
