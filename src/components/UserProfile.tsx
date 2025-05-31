
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

const UserProfile: React.FC = () => {
  const { user, profile, hasGoogleTokens } = useAuth();

  if (!user || !profile) {
    return null;
  }

  const getInitials = (name?: string) => {
    if (!name) return user.email?.charAt(0).toUpperCase() || 'U';
    return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase();
  };

  const connectedServicesCount = profile.google_services_connected?.length || 0;
  const totalGoogleServices = 9; // Total number of Google services we support
  const isGoogleUser = user.app_metadata?.provider === 'google';

  return (
    <div className="flex items-center gap-3">
      <Avatar className="h-8 w-8">
        <AvatarImage src={profile.avatar_url || undefined} alt={profile.full_name || 'User'} />
        <AvatarFallback>{getInitials(profile.full_name)}</AvatarFallback>
      </Avatar>
      
      <div className="flex flex-col">
        <span className="text-sm font-medium">
          {profile.full_name || profile.email || user.email}
        </span>
        
        <div className="flex items-center gap-2">
          {hasGoogleTokens ? (
            <Badge variant="secondary" className="text-xs">
              <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
              {connectedServicesCount}/{totalGoogleServices} Google Services
            </Badge>
          ) : isGoogleUser ? (
            <Badge variant="outline" className="text-xs">
              <AlertTriangle className="h-3 w-3 mr-1 text-yellow-500" />
              Google Auth • No API Access
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs">
              <XCircle className="h-3 w-3 mr-1 text-gray-400" />
              No Google Services
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
