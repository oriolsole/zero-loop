
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { enhancedGoogleOAuthService } from '@/services/enhancedGoogleOAuthService';
import { GOOGLE_SCOPE_CATEGORIES } from '@/types/googleScopes';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, RefreshCw, Unlink } from 'lucide-react';
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

  useEffect(() => {
    checkConnectionStatus();
  }, [user, profile]);

  if (!user) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Google Services
              {connectionStatus.connected ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-gray-400" />
              )}
            </CardTitle>
            <CardDescription>
              {connectionStatus.connected 
                ? 'Your Google account is connected' 
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
            {connectionStatus.connected && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDisconnect}
                disabled={isLoading}
              >
                <Unlink className="h-4 w-4 mr-2" />
                Disconnect
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {connectionStatus.connected && connectionStatus.expires_at && (
          <div className="text-sm text-muted-foreground">
            Access expires: {new Date(connectionStatus.expires_at).toLocaleString()}
          </div>
        )}
        
        <div className="space-y-3">
          {GOOGLE_SCOPE_CATEGORIES.map(category => {
            const categoryScopes = category.scopes;
            const connectedCount = categoryScopes.filter(scope => 
              connectionStatus.connectedServices?.includes(scope.id)
            ).length;
            
            return (
              <div key={category.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{category.name}</h4>
                  <Badge variant={connectedCount > 0 ? "default" : "outline"}>
                    {connectedCount}/{categoryScopes.length} connected
                  </Badge>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {categoryScopes.map(scope => {
                    const isConnected = connectionStatus.connectedServices?.includes(scope.id);
                    return (
                      <div
                        key={scope.id}
                        className={`flex items-center gap-2 p-2 rounded-lg border ${
                          isConnected 
                            ? 'bg-green-50 border-green-200' 
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        {isConnected ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-gray-400" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">{scope.name}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {scope.description}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        
        {!connectionStatus.connected && (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-2">
              Sign in with Google to connect all services
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GoogleServicesStatus;
