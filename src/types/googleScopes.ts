
/**
 * Google API scopes for different services
 */

export interface GoogleScope {
  id: string;
  name: string;
  description: string;
  scope: string;
  required: boolean;
  icon?: string;
}

export interface GoogleScopeCategory {
  id: string;
  name: string;
  description: string;
  scopes: GoogleScope[];
}

export interface GoogleService {
  id: string;
  name: string;
  description: string;
  requiredScopes: string[];
  icon: string;
  color: string;
  scopes: string[];
}

export const GOOGLE_SCOPES: GoogleScope[] = [
  // Basic Account Information (always required)
  {
    id: 'userinfo-email',
    name: 'Email Address',
    description: 'Access to your email address',
    scope: 'https://www.googleapis.com/auth/userinfo.email',
    required: true,
    icon: 'Mail'
  },
  {
    id: 'userinfo-profile',
    name: 'Basic Profile',
    description: 'Access to your basic profile information',
    scope: 'https://www.googleapis.com/auth/userinfo.profile',
    required: true,
    icon: 'Users'
  },
  
  // Google Drive
  {
    id: 'drive',
    name: 'Google Drive',
    description: 'Full access to Google Drive files and folders',
    scope: 'https://www.googleapis.com/auth/drive',
    required: false,
    icon: 'HardDrive'
  },
  
  // Gmail
  {
    id: 'gmail',
    name: 'Gmail',
    description: 'Full access to Gmail (read, send, modify emails)',
    scope: 'https://www.googleapis.com/auth/gmail.modify',
    required: false,
    icon: 'Mail'
  },
  {
    id: 'gmail-readonly',
    name: 'Gmail (Read Only)',
    description: 'Read-only access to Gmail',
    scope: 'https://www.googleapis.com/auth/gmail.readonly',
    required: false,
    icon: 'Mail'
  },
  {
    id: 'gmail-send',
    name: 'Gmail Send',
    description: 'Permission to send emails via Gmail',
    scope: 'https://www.googleapis.com/auth/gmail.send',
    required: false,
    icon: 'Send'
  },
  
  // Google Calendar
  {
    id: 'calendar',
    name: 'Google Calendar',
    description: 'Full access to Google Calendar',
    scope: 'https://www.googleapis.com/auth/calendar',
    required: false,
    icon: 'Calendar'
  },
  {
    id: 'calendar-readonly',
    name: 'Google Calendar (Read Only)',
    description: 'Read-only access to Google Calendar',
    scope: 'https://www.googleapis.com/auth/calendar.readonly',
    required: false,
    icon: 'Calendar'
  },
  
  // Google Sheets
  {
    id: 'spreadsheets',
    name: 'Google Sheets',
    description: 'Full access to Google Sheets',
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    required: false,
    icon: 'Sheet'
  },
  
  // Google Docs
  {
    id: 'documents',
    name: 'Google Docs',
    description: 'Full access to Google Docs',
    scope: 'https://www.googleapis.com/auth/documents',
    required: false,
    icon: 'FileText'
  },
  
  // Google Contacts
  {
    id: 'contacts',
    name: 'Google Contacts',
    description: 'Full access to Google Contacts',
    scope: 'https://www.googleapis.com/auth/contacts',
    required: false,
    icon: 'Users'
  },
  {
    id: 'contacts-readonly',
    name: 'Google Contacts (Read Only)',
    description: 'Read-only access to Google Contacts',
    scope: 'https://www.googleapis.com/auth/contacts.readonly',
    required: false,
    icon: 'Users'
  },
  
  // Google Photos
  {
    id: 'photoslibrary',
    name: 'Google Photos',
    description: 'Access to Google Photos library',
    scope: 'https://www.googleapis.com/auth/photoslibrary.readonly',
    required: false,
    icon: 'Image'
  },
  
  // YouTube
  {
    id: 'youtube',
    name: 'YouTube',
    description: 'Read-only access to YouTube data',
    scope: 'https://www.googleapis.com/auth/youtube.readonly',
    required: false,
    icon: 'Video'
  }
];

export const GOOGLE_SCOPE_CATEGORIES: GoogleScopeCategory[] = [
  {
    id: 'account',
    name: 'Google Account',
    description: 'Basic account information (required)',
    scopes: GOOGLE_SCOPES.filter(scope => scope.required)
  },
  {
    id: 'storage',
    name: 'Storage & Documents',
    description: 'Access your files, documents, and photos',
    scopes: GOOGLE_SCOPES.filter(scope => 
      ['drive', 'documents', 'spreadsheets', 'photoslibrary'].includes(scope.id)
    )
  },
  {
    id: 'communication',
    name: 'Communication',
    description: 'Manage your email, calendar, and contacts',
    scopes: GOOGLE_SCOPES.filter(scope => 
      ['gmail', 'gmail-readonly', 'gmail-send', 'calendar', 'calendar-readonly', 'contacts', 'contacts-readonly'].includes(scope.id)
    )
  },
  {
    id: 'media',
    name: 'Media & Entertainment',
    description: 'Access your photos and YouTube data',
    scopes: GOOGLE_SCOPES.filter(scope => 
      ['photoslibrary', 'youtube'].includes(scope.id)
    )
  }
];

// Convert GOOGLE_SERVICES to an array for easier component usage
export const GOOGLE_SERVICES: GoogleService[] = [
  {
    id: 'google-account',
    name: 'Google Account',
    description: 'Basic account access',
    requiredScopes: ['userinfo-email', 'userinfo-profile'],
    icon: 'google-account',
    color: 'bg-blue-500',
    scopes: [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ]
  },
  {
    id: 'google-drive',
    name: 'Google Drive',
    description: 'File storage and management',
    requiredScopes: ['drive'],
    icon: 'google-drive',
    color: 'bg-green-500',
    scopes: ['https://www.googleapis.com/auth/drive']
  },
  {
    id: 'gmail',
    name: 'Gmail',
    description: 'Email management and automation',
    requiredScopes: ['gmail'],
    icon: 'gmail',
    color: 'bg-red-500',
    scopes: ['https://www.googleapis.com/auth/gmail.modify']
  },
  {
    id: 'google-calendar',
    name: 'Google Calendar',
    description: 'Calendar and event management',
    requiredScopes: ['calendar'],
    icon: 'google-calendar',
    color: 'bg-blue-600',
    scopes: ['https://www.googleapis.com/auth/calendar']
  },
  {
    id: 'google-sheets',
    name: 'Google Sheets',
    description: 'Spreadsheet data manipulation',
    requiredScopes: ['spreadsheets'],
    icon: 'google-sheets',
    color: 'bg-green-600',
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  },
  {
    id: 'google-docs',
    name: 'Google Docs',
    description: 'Document creation and editing',
    requiredScopes: ['documents'],
    icon: 'google-docs',
    color: 'bg-blue-700',
    scopes: ['https://www.googleapis.com/auth/documents']
  },
  {
    id: 'google-contacts',
    name: 'Google Contacts',
    description: 'Contact management',
    requiredScopes: ['contacts'],
    icon: 'google-contacts',
    color: 'bg-orange-500',
    scopes: ['https://www.googleapis.com/auth/contacts']
  },
  {
    id: 'google-photos',
    name: 'Google Photos',
    description: 'Photo library access',
    requiredScopes: ['photoslibrary'],
    icon: 'google-photos',
    color: 'bg-pink-500',
    scopes: ['https://www.googleapis.com/auth/photoslibrary.readonly']
  },
  {
    id: 'youtube',
    name: 'YouTube',
    description: 'Video content access',
    requiredScopes: ['youtube'],
    icon: 'youtube',
    color: 'bg-red-600',
    scopes: ['https://www.googleapis.com/auth/youtube.readonly']
  }
];

// Legacy object format for backward compatibility
export const GOOGLE_SERVICES_MAP = {
  'google-account': GOOGLE_SERVICES.find(s => s.id === 'google-account')!,
  'google-drive': GOOGLE_SERVICES.find(s => s.id === 'google-drive')!,
  'gmail': GOOGLE_SERVICES.find(s => s.id === 'gmail')!,
  'google-calendar': GOOGLE_SERVICES.find(s => s.id === 'google-calendar')!,
  'google-sheets': GOOGLE_SERVICES.find(s => s.id === 'google-sheets')!,
  'google-docs': GOOGLE_SERVICES.find(s => s.id === 'google-docs')!,
  'google-contacts': GOOGLE_SERVICES.find(s => s.id === 'google-contacts')!,
  'google-photos': GOOGLE_SERVICES.find(s => s.id === 'google-photos')!,
  'youtube': GOOGLE_SERVICES.find(s => s.id === 'youtube')!
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
    const service = GOOGLE_SERVICES.find(s => s.id === serviceId);
    if (service) {
      service.scopes.forEach(scope => scopes.add(scope));
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
