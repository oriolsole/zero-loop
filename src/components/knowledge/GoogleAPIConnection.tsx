
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { enhancedGoogleOAuthService } from '@/services/enhancedGoogleOAuthService';
import { GOOGLE_SERVICES } from '@/types/googleScopes';
import { toast } from '@/components/ui/sonner';
import { Loader2, CheckCircle, XCircle, RefreshCw, ExternalLink, AlertTriangle } from 'lucide-react';

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
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
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
                      <div className={`p-1 rounded ${service.color} text-white`}>
                        <div className="w-4 h-4" />
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
