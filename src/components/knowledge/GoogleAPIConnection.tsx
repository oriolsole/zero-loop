import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { enhancedGoogleOAuthService } from '@/services/enhancedGoogleOAuthService';
import { GOOGLE_SERVICES } from '@/types/googleScopes';
import { toast } from '@/components/ui/sonner';
import { Loader2, CheckCircle, XCircle, RefreshCw, ExternalLink, AlertTriangle } from 'lucide-react';
import { GoogleServiceIcon } from '@/components/icons/GoogleIcons';

interface GoogleAPIConnectionProps {
  onConnectionChange?: (connected: boolean) => void;
}

const GoogleAPIConnection: React.FC<GoogleAPIConnectionProps> = ({ 
  onConnectionChange 
}) => {
  const [status, setStatus] = useState<any>({ connected: false });
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  const checkConnectionStatus = async () => {
    try {
      const connectionStatus = await enhancedGoogleOAuthService.getConnectionStatus();
      console.log('📊 GoogleAPIConnection status:', connectionStatus);
      setStatus(connectionStatus);
      onConnectionChange?.(connectionStatus.connected);
    } catch (error) {
      console.error('Failed to check connection status:', error);
      toast.error('Failed to check Google API connection');
    } finally {
      setIsChecking(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      console.log('🔄 Starting manual sync from GoogleAPIConnection...');
      await enhancedGoogleOAuthService.syncProfileFromTokens();
      await checkConnectionStatus();
      toast.success('Google services synced successfully');
    } catch (error) {
      console.error('Sync failed:', error);
      toast.error('Failed to sync Google services');
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    checkConnectionStatus();
  }, []);

  const handleConnect = async () => {
    setIsLoading(true);
    try {
      // Get all scopes for comprehensive access
      const allScopes = GOOGLE_SERVICES.flatMap(service => service.scopes);
      
      // Use the new redirect-only flow
      await enhancedGoogleOAuthService.connectWithRedirect(allScopes);
    } catch (error) {
      console.error('OAuth connection failed:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to connect Google APIs');
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setIsLoading(true);
    try {
      await enhancedGoogleOAuthService.disconnect();
      await checkConnectionStatus();
      toast.success('Google APIs disconnected successfully');
    } catch (error) {
      console.error('Disconnect failed:', error);
      toast.error('Failed to disconnect Google APIs');
    } finally {
      setIsLoading(false);
    }
  };

  if (isChecking) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Checking connection...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const connectedServices = status.connectedServices || [];
  const totalServices = GOOGLE_SERVICES.length;
  const hasDataMismatch = status.connected && connectedServices.length === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GoogleServiceIcon service="google-account" size={24} />
            <span>Google Services</span>
          </div>
          {status.connected ? (
            <div className="flex items-center gap-2">
              <Badge variant="default" className="bg-green-500">
                <CheckCircle className="h-3 w-3 mr-1" />
                Connected ({connectedServices.length}/{totalServices})
              </Badge>
              {hasDataMismatch && (
                <Badge variant="destructive">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Sync Issue
                </Badge>
              )}
            </div>
          ) : (
            <Badge variant="secondary">
              <XCircle className="h-3 w-3 mr-1" />
              Not Connected
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          {status.connected
            ? hasDataMismatch 
              ? 'Connection detected but services need sync'
              : 'Your Google services are connected and ready for MCP tools'
            : 'Connect Google services to enable advanced MCP integrations'
          }
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {hasDataMismatch && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg dark:bg-yellow-950 dark:border-yellow-800">
            <div className="flex items-center gap-2 text-sm text-yellow-800 dark:text-yellow-200">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium">Data Sync Issue Detected</span>
            </div>
            <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
              Google tokens exist but profile data is not synced. Click "Sync Services" to fix this.
            </p>
          </div>
        )}

        {status.connected && status.expires_at && (
          <div className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-lg">
            <strong>Access expires:</strong> {new Date(status.expires_at).toLocaleString()}
          </div>
        )}

        {status.connected && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Connected Services:</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {GOOGLE_SERVICES.map(service => {
                const isConnected = connectedServices.includes(service.id);
                
                return (
                  <div key={service.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-2">
                      <div className={`p-1 rounded ${service.color} text-white flex items-center justify-center`}>
                        <GoogleServiceIcon 
                          service={service.icon as any} 
                          size={16} 
                          className="text-white"
                        />
                      </div>
                      <span className="text-sm font-medium">{service.name}</span>
                    </div>
                    <Badge variant={isConnected ? "default" : "outline"} className="text-xs">
                      {isConnected ? 'Connected' : 'Not Connected'}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        <div className="flex space-x-2">
          {status.connected ? (
            <>
              <Button 
                variant="outline" 
                onClick={handleDisconnect}
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Disconnect
              </Button>
              <Button 
                variant="secondary" 
                onClick={handleSync}
                disabled={isSyncing}
              >
                {isSyncing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Sync Services
              </Button>
            </>
          ) : (
            <Button 
              onClick={handleConnect}
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <ExternalLink className="h-4 w-4 mr-2" />
              Connect Google Services
            </Button>
          )}
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={checkConnectionStatus}
            disabled={isLoading}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>

          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowDebug(!showDebug)}
          >
            Debug
          </Button>
        </div>

        {showDebug && (
          <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg text-xs">
            <div className="font-medium mb-2">Debug Information:</div>
            <pre className="whitespace-pre-wrap overflow-auto max-h-40">
              {JSON.stringify(status, null, 2)}
            </pre>
          </div>
        )}
        
        {!status.connected && (
          <div className="text-xs text-muted-foreground space-y-2">
            <p>Connecting enables MCP tools for:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
              <span>• Gmail integration and automation</span>
              <span>• Google Drive file management</span>
              <span>• Calendar scheduling and events</span>
              <span>• Docs and Sheets manipulation</span>
              <span>• Contacts and other services</span>
              <span>• YouTube data access</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GoogleAPIConnection;
