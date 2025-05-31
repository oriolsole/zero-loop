import React from 'react';

interface GoogleIconProps {
  size?: number;
  className?: string;
}

export const GoogleDriveIcon: React.FC<GoogleIconProps> = ({ size = 24, className = "" }) => (
  <img 
    src="/google-drive-icon.png" 
    alt="Google Drive" 
    width={size} 
    height={size} 
    className={className}
    style={{ objectFit: 'contain' }}
  />
);

export const GmailIcon: React.FC<GoogleIconProps> = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
    <path fill="#EA4335" d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636C.732 21.002 0 20.27 0 19.366V5.457c0-.904.732-1.636 1.636-1.636h.96L12 11.182 21.405 3.82h.959c.904 0 1.636.733 1.636 1.637z"/>
  </svg>
);

export const GoogleCalendarIcon: React.FC<GoogleIconProps> = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
    <path fill="#4285F4" d="M19 3h-1V1h-2v2H8V1H6v2H5C3.9 3 3 3.9 3 5v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z"/>
    <path fill="#34A853" d="M7 10h5v5H7z"/>
  </svg>
);

export const GoogleSheetsIcon: React.FC<GoogleIconProps> = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
    <path fill="#34A853" d="M11.318 12.545H7.91v-1.909h3.408v1.91zM14.727 0v6h6l-6-6z"/>
    <path fill="#137333" d="M16.636 1.5v5.182h5.182L16.636 1.5z"/>
    <path fill="#34A853" d="M16.636 6.682V24H2.727C1.227 24 0 22.773 0 21.273V2.727C0 1.227 1.227 0 2.727 0h13.91v6.682z"/>
    <path fill="white" d="M3.273 9.545h11.727v1.91H3.273zM3.273 12.545h4.636v1.91H3.273zM10.727 12.545h4.636v1.91h-4.636zM3.273 15.545h4.636v1.91H3.273zM10.727 15.545h4.636v1.91h-4.636z"/>
  </svg>
);

export const GoogleDocsIcon: React.FC<GoogleIconProps> = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
    <path fill="#4285F4" d="M14.727 0v6h6l-6-6z"/>
    <path fill="#1A73E8" d="M16.636 1.5v5.182h5.182L16.636 1.5z"/>
    <path fill="#4285F4" d="M16.636 6.682V24H2.727C1.227 24 0 22.773 0 21.273V2.727C0 1.227 1.227 0 2.727 0h13.91v6.682z"/>
    <path fill="white" d="M4.909 9.545h10.182v1.091H4.909zM4.909 12.545h10.182v1.091H4.909zM4.909 15.545h6.545v1.091H4.909z"/>
  </svg>
);

export const GooglePhotosIcon: React.FC<GoogleIconProps> = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
    <path fill="#4285F4" d="M12 0c3.24 0 6.24 1.32 8.4 3.6L12 12 3.6 3.6C5.76 1.32 8.76 0 12 0z"/>
    <path fill="#34A853" d="M0 12c0-3.24 1.32-6.24 3.6-8.4L12 12l-8.4 8.4C1.32 18.24 0 15.24 0 12z"/>
    <path fill="#FBBC04" d="M12 24c-3.24 0-6.24-1.32-8.4-3.6L12 12l8.4 8.4c-2.16 2.28-5.16 3.6-8.4 3.6z"/>
    <path fill="#EA4335" d="M24 12c0 3.24-1.32 6.24-3.6 8.4L12 12l8.4-8.4c2.28 2.16 3.6 5.16 3.6 8.4z"/>
  </svg>
);

export const YouTubeIcon: React.FC<GoogleIconProps> = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
    <path fill="#FF0000" d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"/>
    <path fill="white" d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

export const GoogleContactsIcon: React.FC<GoogleIconProps> = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
    <path fill="#4285F4" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15c0-2.66 2.34-5 5-5s5 2.34 5 5v1H10v-1zm2.5-6c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z"/>
    <path fill="#EA4335" d="M12.5 8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
  </svg>
);

export const GoogleAccountIcon: React.FC<GoogleIconProps> = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
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
