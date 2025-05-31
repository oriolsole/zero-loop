
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { enhancedGoogleOAuthService } from '@/services/enhancedGoogleOAuthService';
import { GOOGLE_SCOPE_CATEGORIES } from '@/types/googleScopes';
import { toast } from '@/components/ui/sonner';
import { Loader2, CheckCircle, XCircle, RefreshCw, ExternalLink } from 'lucide-react';

interface GoogleAPIConnectionProps {
  onConnectionChange?: (connected: boolean) => void;
}

const GoogleAPIConnection: React.FC<GoogleAPIConnectionProps> = ({ 
  onConnectionChange 
}) => {
  const [status, setStatus] = useState<any>({ connected: false });
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  const checkConnectionStatus = async () => {
    try {
      const connectionStatus = await enhancedGoogleOAuthService.getConnectionStatus();
      setStatus(connectionStatus);
      onConnectionChange?.(connectionStatus.connected);
    } catch (error) {
      console.error('Failed to check connection status:', error);
      toast.error('Failed to check Google API connection');
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkConnectionStatus();
  }, []);

  const handleConnect = async () => {
    setIsLoading(true);
    try {
      // Get all scopes for comprehensive access
      const allScopes = GOOGLE_SCOPE_CATEGORIES.flatMap(category => 
        category.scopes.map(scope => scope.scope)
      );
      
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
  const totalServices = GOOGLE_SCOPE_CATEGORIES.reduce((acc, cat) => acc + cat.scopes.length, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Google API Access</span>
          {status.connected ? (
            <Badge variant="default" className="bg-green-500">
              <CheckCircle className="h-3 w-3 mr-1" />
              Connected ({connectedServices.length}/{totalServices})
            </Badge>
          ) : (
            <Badge variant="secondary">
              <XCircle className="h-3 w-3 mr-1" />
              Not Connected
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          {status.connected
            ? 'Your Google APIs are connected and ready for MCP tools'
            : 'Connect Google APIs to enable advanced MCP integrations'
          }
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {status.connected && status.expires_at && (
          <div className="text-sm text-muted-foreground">
            <strong>Access expires:</strong> {new Date(status.expires_at).toLocaleString()}
          </div>
        )}

        {status.connected && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Available Services:</h4>
            <div className="grid grid-cols-2 gap-2">
              {GOOGLE_SCOPE_CATEGORIES.map(category => {
                const categoryConnected = category.scopes.filter(scope => 
                  connectedServices.includes(scope.id)
                ).length;
                
                return (
                  <div key={category.id} className="flex items-center justify-between p-2 rounded border">
                    <span className="text-sm">{category.name}</span>
                    <Badge variant={categoryConnected > 0 ? "default" : "outline"} className="text-xs">
                      {categoryConnected}/{category.scopes.length}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        <div className="flex space-x-2">
          {status.connected ? (
            <Button 
              variant="outline" 
              onClick={handleDisconnect}
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Disconnect
            </Button>
          ) : (
            <Button 
              onClick={handleConnect}
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <ExternalLink className="h-4 w-4 mr-2" />
              Connect Google APIs
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
        </div>
        
        {!status.connected && (
          <div className="text-xs text-muted-foreground">
            <p>Connecting enables MCP tools for:</p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Gmail integration and automation</li>
              <li>Google Drive file management</li>
              <li>Calendar scheduling and events</li>
              <li>Docs and Sheets manipulation</li>
              <li>Contacts and other Google services</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GoogleAPIConnection;
