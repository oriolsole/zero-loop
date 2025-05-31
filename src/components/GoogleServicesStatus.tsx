import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { enhancedGoogleOAuthService } from '@/services/enhancedGoogleOAuthService';
import { GOOGLE_SERVICES } from '@/types/googleScopes';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, RefreshCw, Unlink, ExternalLink, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { GoogleServiceIcon } from '@/components/icons/GoogleIcons';

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
  const [isSyncing, setIsSyncing] = useState(false);

  const checkConnectionStatus = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const status = await enhancedGoogleOAuthService.getConnectionStatus();
      setConnectionStatus(status);
      console.log('📊 Connection status updated:', status);
    } catch (error) {
      console.error('Error checking connection status:', error);
      toast.error('Failed to check Google connection status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSync = async () => {
    if (!user) return;
    
    setIsSyncing(true);
    try {
      console.log('🔄 Starting manual sync...');
      await enhancedGoogleOAuthService.syncProfileFromTokens();
      await refreshProfile();
      await checkConnectionStatus();
      toast.success('Google services synced successfully');
      console.log('✅ Manual sync completed');
    } catch (error) {
      console.error('Error syncing Google services:', error);
      toast.error('Failed to sync Google services');
    } finally {
      setIsSyncing(false);
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
                <GoogleServiceIcon service="google-account" size={24} />
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
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
            {connectionStatus.connected && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleManualSync}
                disabled={isSyncing}
                title="Sync services from stored tokens"
              >
                {isSyncing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Sync
              </Button>
            )}
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
                <div className={`p-2 rounded-lg ${service.color} flex-shrink-0 flex items-center justify-center`}>
                  <GoogleServiceIcon 
                    service={service.icon as any} 
                    size={20} 
                    className="text-white"
                  />
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
