
export interface GoogleScope {
  id: string;
  name: string;
  description: string;
  scope: string;
  icon: string;
  category: 'productivity' | 'communication' | 'storage' | 'media';
  required?: boolean;
}

export interface GoogleScopeCategory {
  id: string;
  name: string;
  description: string;
  scopes: GoogleScope[];
}

export const GOOGLE_SCOPES: GoogleScope[] = [
  // Storage & Files
  {
    id: 'drive',
    name: 'Google Drive',
    description: 'Access and manage your Google Drive files',
    scope: 'https://www.googleapis.com/auth/drive',
    icon: 'HardDrive',
    category: 'storage',
    required: true
  },
  
  // Communication
  {
    id: 'gmail-read',
    name: 'Gmail (Read)',
    description: 'Read your Gmail messages',
    scope: 'https://www.googleapis.com/auth/gmail.readonly',
    icon: 'Mail',
    category: 'communication'
  },
  {
    id: 'gmail-send',
    name: 'Gmail (Send)',
    description: 'Send emails on your behalf',
    scope: 'https://www.googleapis.com/auth/gmail.send',
    icon: 'Send',
    category: 'communication'
  },
  {
    id: 'contacts',
    name: 'Contacts',
    description: 'Access your Google contacts',
    scope: 'https://www.googleapis.com/auth/contacts.readonly',
    icon: 'Users',
    category: 'communication'
  },
  
  // Productivity
  {
    id: 'calendar',
    name: 'Google Calendar',
    description: 'Access and manage your calendar events',
    scope: 'https://www.googleapis.com/auth/calendar',
    icon: 'Calendar',
    category: 'productivity'
  },
  {
    id: 'sheets',
    name: 'Google Sheets',
    description: 'Access and edit your spreadsheets',
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    icon: 'Sheet',
    category: 'productivity'
  },
  {
    id: 'docs',
    name: 'Google Docs',
    description: 'Access and edit your documents',
    scope: 'https://www.googleapis.com/auth/documents',
    icon: 'FileText',
    category: 'productivity'
  },
  
  // Media
  {
    id: 'photos',
    name: 'Google Photos',
    description: 'Access your Google Photos library',
    scope: 'https://www.googleapis.com/auth/photoslibrary.readonly',
    icon: 'Image',
    category: 'media'
  },
  {
    id: 'youtube',
    name: 'YouTube',
    description: 'Access your YouTube data',
    scope: 'https://www.googleapis.com/auth/youtube.readonly',
    icon: 'Video',
    category: 'media'
  }
];

export const GOOGLE_SCOPE_CATEGORIES: GoogleScopeCategory[] = [
  {
    id: 'storage',
    name: 'Storage & Files',
    description: 'Access your files and documents',
    scopes: GOOGLE_SCOPES.filter(s => s.category === 'storage')
  },
  {
    id: 'productivity',
    name: 'Productivity Tools',
    description: 'Calendar, Sheets, Docs and more',
    scopes: GOOGLE_SCOPES.filter(s => s.category === 'productivity')
  },
  {
    id: 'communication',
    name: 'Communication',
    description: 'Email, contacts and messaging',
    scopes: GOOGLE_SCOPES.filter(s => s.category === 'communication')
  },
  {
    id: 'media',
    name: 'Media & Entertainment',
    description: 'Photos, videos and media content',
    scopes: GOOGLE_SCOPES.filter(s => s.category === 'media')
  }
];

export const getRequiredScopes = (): string[] => {
  return GOOGLE_SCOPES.filter(scope => scope.required).map(scope => scope.scope);
};

export const getAllScopes = (): string[] => {
  return GOOGLE_SCOPES.map(scope => scope.scope);
};

export const getScopesByCategory = (category: string): GoogleScope[] => {
  return GOOGLE_SCOPES.filter(scope => scope.category === category);
};
