
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { enhancedGoogleOAuthService } from '@/services/enhancedGoogleOAuthService';
import { GOOGLE_SERVICES } from '@/types/googleScopes';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, RefreshCw, Unlink, ExternalLink } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

interface GoogleConnectionStatus {
  connected: boolean;
  connectedServices?: string[];
  grantedScopes?: string[];
  expires_at?: string;
}

const GoogleServicesStatus: React.FC = () => {
  const { user, profile, refreshProfile } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState<GoogleConnectionStatus>({ connected: false });
  const [isLoading, setIsLoading] = useState(false);

  const checkConnectionStatus = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const status = await enhancedGoogleOAuthService.getConnectionStatus();
      setConnectionStatus(status);
    } catch (error) {
      console.error('Error checking connection status:', error);
      toast.error('Failed to check Google connection status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      await enhancedGoogleOAuthService.disconnect();
      await refreshProfile();
      await checkConnectionStatus();
      toast.success('Google services disconnected successfully');
    } catch (error) {
      console.error('Error disconnecting Google services:', error);
      toast.error('Failed to disconnect Google services');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    setIsLoading(true);
    try {
      const allScopes = GOOGLE_SERVICES.flatMap(service => service.scopes);
      await enhancedGoogleOAuthService.connectWithRedirect(allScopes);
    } catch (error) {
      console.error('OAuth connection failed:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to connect Google services');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkConnectionStatus();
  }, [user, profile]);

  if (!user) return null;

  const connectedCount = connectionStatus.connectedServices?.length || 0;
  const totalCount = GOOGLE_SERVICES.length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google Services
              </div>
              {connectionStatus.connected ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-gray-400" />
              )}
            </CardTitle>
            <CardDescription>
              {connectionStatus.connected 
                ? `${connectedCount} of ${totalCount} services connected` 
                : 'Connect your Google account to access services'
              }
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={checkConnectionStatus}
              disabled={isLoading}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            {connectionStatus.connected ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDisconnect}
                disabled={isLoading}
              >
                <Unlink className="h-4 w-4 mr-2" />
                Disconnect
              </Button>
            ) : (
              <Button
                onClick={handleConnect}
                disabled={isLoading}
                size="sm"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Connect Google
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {connectionStatus.connected && connectionStatus.expires_at && (
          <div className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-lg">
            <strong>Access expires:</strong> {new Date(connectionStatus.expires_at).toLocaleString()}
          </div>
        )}
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {GOOGLE_SERVICES.map(service => {
            const isConnected = connectionStatus.connectedServices?.includes(service.id);
            
            return (
              <div
                key={service.id}
                className={`flex items-center gap-3 p-4 rounded-lg border transition-all ${
                  isConnected 
                    ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800' 
                    : 'bg-gray-50 border-gray-200 dark:bg-gray-950 dark:border-gray-800'
                }`}
              >
                <div className={`p-2 rounded-lg ${service.color} text-white flex-shrink-0`}>
                  <div className="w-6 h-6 flex items-center justify-center">
                    {service.name === 'Gmail' && (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636C.732 21.002 0 20.27 0 19.366V5.457c0-.904.732-1.636 1.636-1.636h.96L12 11.182 21.405 3.82h.959c.904 0 1.636.733 1.636 1.637z"/>
                      </svg>
                    )}
                    {service.name === 'Google Drive' && (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6.92 13.92L10.92 6.5h2.16l4 7.42H6.92zM2.84 15.92l2.92-5.08L7.84 13H2.84zM16.16 13l2.08-2.16 2.92 5.08H16.16z"/>
                      </svg>
                    )}
                    {service.name === 'Google Calendar' && (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19 3h-1V1h-2v2H8V1H6v2H5C3.9 3 3 3.9 3 5v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
                      </svg>
                    )}
                    {service.name === 'YouTube' && (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                      </svg>
                    )}
                    {!['Gmail', 'Google Drive', 'Google Calendar', 'YouTube'].includes(service.name) && (
                      <div className="w-4 h-4 bg-white/20 rounded" />
                    )}
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="font-medium text-sm">{service.name}</div>
                    {isConnected ? (
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {service.description}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {!connectionStatus.connected && (
          <div className="text-center py-6 space-y-3">
            <div className="text-sm text-muted-foreground">
              Connect your Google account to enable powerful integrations with ZeroLoop
            </div>
            <div className="flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
              <span>• Access your files and documents</span>
              <span>• Send and manage emails</span>
              <span>• Schedule calendar events</span>
              <span>• And much more...</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GoogleServicesStatus;
