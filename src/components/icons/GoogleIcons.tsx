
import React from 'react';

interface GoogleIconProps {
  size?: number;
  className?: string;
}

export const GoogleDriveIcon: React.FC<GoogleIconProps> = ({ size = 24, className = "" }) => (
  <img 
    src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Google_Drive_icon_%282020%29.svg/640px-Google_Drive_icon_%282020%29.svg.png"
    alt="Google Drive" 
    width={size} 
    height={size} 
    className={className}
    style={{ objectFit: 'contain' }}
  />
);

export const GmailIcon: React.FC<GoogleIconProps> = ({ size = 24, className = "" }) => (
  <img 
    src="https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Gmail_icon_%282020%29.svg/640px-Gmail_icon_%282020%29.svg.png"
    alt="Gmail" 
    width={size} 
    height={size} 
    className={className}
    style={{ objectFit: 'contain' }}
  />
);

export const GoogleCalendarIcon: React.FC<GoogleIconProps> = ({ size = 24, className = "" }) => (
  <img 
    src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Google_Calendar_icon_%282020%29.svg/640px-Google_Calendar_icon_%282020%29.svg.png"
    alt="Google Calendar" 
    width={size} 
    height={size} 
    className={className}
    style={{ objectFit: 'contain' }}
  />
);

export const GoogleSheetsIcon: React.FC<GoogleIconProps> = ({ size = 24, className = "" }) => (
  <img 
    src="https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Google_Sheets_logo_%282014-2020%29.svg/640px-Google_Sheets_logo_%282014-2020%29.svg.png"
    alt="Google Sheets" 
    width={size} 
    height={size} 
    className={className}
    style={{ objectFit: 'contain' }}
  />
);

export const GoogleDocsIcon: React.FC<GoogleIconProps> = ({ size = 24, className = "" }) => (
  <img 
    src="https://upload.wikimedia.org/wikipedia/commons/thumb/0/01/Google_Docs_logo_%282014-2020%29.svg/640px-Google_Docs_logo_%282014-2020%29.svg.png"
    alt="Google Docs" 
    width={size} 
    height={size} 
    className={className}
    style={{ objectFit: 'contain' }}
  />
);

export const GooglePhotosIcon: React.FC<GoogleIconProps> = ({ size = 24, className = "" }) => (
  <img 
    src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Google_Photos_icon_%282020%29.svg/640px-Google_Photos_icon_%282020%29.svg.png"
    alt="Google Photos" 
    width={size} 
    height={size} 
    className={className}
    style={{ objectFit: 'contain' }}
  />
);

export const YouTubeIcon: React.FC<GoogleIconProps> = ({ size = 24, className = "" }) => (
  <img 
    src="https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/YouTube_full-color_icon_%282017%29.svg/640px-YouTube_full-color_icon_%282017%29.svg.png"
    alt="YouTube" 
    width={size} 
    height={size} 
    className={className}
    style={{ objectFit: 'contain' }}
  />
);

export const GoogleContactsIcon: React.FC<GoogleIconProps> = ({ size = 24, className = "" }) => (
  <img 
    src="https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Google_Contacts_icon.svg/640px-Google_Contacts_icon.svg.png"
    alt="Google Contacts" 
    width={size} 
    height={size} 
    className={className}
    style={{ objectFit: 'contain' }}
  />
);

export const GoogleAccountIcon: React.FC<GoogleIconProps> = ({ size = 24, className = "" }) => (
  <img 
    src="https://developers.google.com/identity/images/g-logo.png"
    alt="Google Account" 
    width={size} 
    height={size} 
    className={className}
    style={{ objectFit: 'contain' }}
  />
);

// Export all Google icons in a convenient object
export const GoogleIcons = {
  'google-account': GoogleAccountIcon,
  'gmail': GmailIcon,
  'google-drive': GoogleDriveIcon,
  'google-calendar': GoogleCalendarIcon,
  'google-sheets': GoogleSheetsIcon,
  'google-docs': GoogleDocsIcon,
  'google-contacts': GoogleContactsIcon,
  'google-photos': GooglePhotosIcon,
  'youtube': YouTubeIcon,
} as const;

export type GoogleIconType = keyof typeof GoogleIcons;

// Generic Google Service Icon component
interface GoogleServiceIconProps extends GoogleIconProps {
  service: GoogleIconType;
}

export const GoogleServiceIcon: React.FC<GoogleServiceIconProps> = ({ service, size = 24, className = "" }) => {
  const IconComponent = GoogleIcons[service];
  return IconComponent ? <IconComponent size={size} className={className} /> : null;
};
