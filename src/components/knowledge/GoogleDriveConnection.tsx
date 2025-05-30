
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { googleOAuthService, GoogleOAuthStatus } from '@/services/googleOAuthService';
import { toast } from '@/components/ui/sonner';
import { Loader2, CheckCircle, XCircle, ExternalLink } from 'lucide-react';

interface GoogleDriveConnectionProps {
  onConnectionChange?: (connected: boolean) => void;
}

const GoogleDriveConnection: React.FC<GoogleDriveConnectionProps> = ({ 
  onConnectionChange 
}) => {
  const [status, setStatus] = useState<GoogleOAuthStatus>({ connected: false });
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  const checkConnectionStatus = async () => {
    try {
      const connectionStatus = await googleOAuthService.getConnectionStatus();
      setStatus(connectionStatus);
      onConnectionChange?.(connectionStatus.connected);
    } catch (error) {
      console.error('Failed to check connection status:', error);
      toast.error('Failed to check Google Drive connection');
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
      await googleOAuthService.connectWithPopup();
      await checkConnectionStatus();
      toast.success('Google Drive connected successfully!');
    } catch (error) {
      console.error('OAuth connection failed:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to connect Google Drive');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setIsLoading(true);
    try {
      await googleOAuthService.disconnect();
      await checkConnectionStatus();
      toast.success('Google Drive disconnected successfully');
    } catch (error) {
      console.error('Disconnect failed:', error);
      toast.error('Failed to disconnect Google Drive');
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Google Drive Connection</span>
          {status.connected ? (
            <Badge variant="default" className="bg-green-500">
              <CheckCircle className="h-3 w-3 mr-1" />
              Connected
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
            ? 'Your Google Drive is connected and ready to use'
            : 'Connect your Google Drive to access your files'
          }
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {status.connected && status.expires_at && (
          <div className="text-sm text-muted-foreground">
            <strong>Token expires:</strong> {new Date(status.expires_at).toLocaleString()}
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
              Connect Google Drive
            </Button>
          )}
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={checkConnectionStatus}
            disabled={isLoading}
          >
            Refresh Status
          </Button>
        </div>
        
        {!status.connected && (
          <div className="text-xs text-muted-foreground">
            <p>Connecting your Google Drive allows the AI agent to:</p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>List and search your files</li>
              <li>Read document content</li>
              <li>Upload new files</li>
              <li>Create and organize folders</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GoogleDriveConnection;
