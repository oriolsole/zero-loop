
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { LogOut, Settings, User, CheckCircle, XCircle, Link } from 'lucide-react';
import { GOOGLE_SCOPES } from '@/types/googleScopes';
import GoogleScopeSelector from './GoogleScopeSelector';
import { enhancedGoogleOAuthService } from '@/services/enhancedGoogleOAuthService';
import { getRequiredScopes } from '@/types/googleScopes';

const EnhancedUserMenu: React.FC = () => {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const [showScopeManager, setShowScopeManager] = useState(false);
  const [selectedScopes, setSelectedScopes] = useState<string[]>(getRequiredScopes());
  const [isConnecting, setIsConnecting] = useState(false);

  if (!user) return null;

  const getInitials = (name?: string) => {
    if (!name) return user.email?.charAt(0).toUpperCase() || 'U';
    return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase();
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const getConnectedServices = () => {
    if (!profile?.google_services_connected) return [];
    return GOOGLE_SCOPES.filter(scope => 
      profile.google_services_connected.includes(scope.id)
    );
  };

  const handleManageServices = () => {
    // Pre-select currently granted scopes
    setSelectedScopes(profile?.google_scopes_granted || getRequiredScopes());
    setShowScopeManager(true);
  };

  const handleUpdateServices = async () => {
    setIsConnecting(true);
    try {
      await enhancedGoogleOAuthService.connectWithPopup(selectedScopes);
      await refreshProfile();
      setShowScopeManager(false);
    } catch (error) {
      console.error('Error updating services:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const connectedServices = getConnectedServices();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-10 w-10 rounded-full">
            <Avatar className="h-10 w-10">
              <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || 'User'} />
              <AvatarFallback>{getInitials(profile?.full_name)}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent className="w-80" align="end">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-2">
              <p className="text-sm font-medium leading-none">
                {profile?.full_name || 'User'}
              </p>
              <p className="text-xs leading-none text-muted-foreground">
                {profile?.email || user.email}
              </p>
              
              {/* Connected Services Overview */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">Connected Services</span>
                  <Badge variant="outline" className="text-xs">
                    {connectedServices.length} / {GOOGLE_SCOPES.length}
                  </Badge>
                </div>
                
                {connectedServices.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {connectedServices.slice(0, 4).map((service) => (
                      <Badge key={service.id} variant="secondary" className="text-xs">
                        <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
                        {service.name}
                      </Badge>
                    ))}
                    {connectedServices.length > 4 && (
                      <Badge variant="outline" className="text-xs">
                        +{connectedServices.length - 4} more
                      </Badge>
                    )}
                  </div>
                ) : (
                  <Badge variant="outline" className="text-xs w-full justify-center">
                    <XCircle className="h-3 w-3 mr-1 text-gray-400" />
                    No Services Connected
                  </Badge>
                )}
              </div>
            </div>
          </DropdownMenuLabel>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem>
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={handleManageServices}>
            <Link className="mr-2 h-4 w-4" />
            <span>Manage Services</span>
          </DropdownMenuItem>
          
          <DropdownMenuItem>
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Service Management Dialog */}
      <Dialog open={showScopeManager} onOpenChange={setShowScopeManager}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Google Services</DialogTitle>
          </DialogHeader>
          <GoogleScopeSelector
            selectedScopes={selectedScopes}
            onScopesChange={setSelectedScopes}
            onProceed={handleUpdateServices}
            isLoading={isConnecting}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EnhancedUserMenu;
