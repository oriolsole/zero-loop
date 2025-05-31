
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Plug, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const GoogleServicesConnection: React.FC = () => {
  const { user, hasGoogleTokens, connectGoogleServices, isLoading } = useAuth();

  if (!user) return null;

  const isGoogleUser = user.app_metadata?.provider === 'google';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plug className="h-5 w-5" />
          Google Services Connection
        </CardTitle>
        <CardDescription>
          Connect to Google services for full API access and functionality
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">Authentication Status:</span>
              {isGoogleUser ? (
                <Badge variant="default" className="text-xs">
                  <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
                  Signed in with Google
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs">
                  <XCircle className="h-3 w-3 mr-1 text-gray-400" />
                  Not using Google auth
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <span className="font-medium">API Access Status:</span>
              {hasGoogleTokens ? (
                <Badge variant="default" className="text-xs">
                  <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
                  Services Connected
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs">
                  <XCircle className="h-3 w-3 mr-1 text-gray-400" />
                  Services Not Connected
                </Badge>
              )}
            </div>
          </div>
        </div>

        {!hasGoogleTokens && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {isGoogleUser 
                ? "You're signed in with Google, but need to connect Google services for full API access."
                : "Connect Google services to access Google Drive, Gmail, Calendar, and other Google APIs."
              }
            </AlertDescription>
          </Alert>
        )}

        {!hasGoogleTokens && (
          <Button 
            onClick={connectGoogleServices}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? 'Connecting...' : 'Connect Google Services'}
          </Button>
        )}

        {hasGoogleTokens && (
          <div className="space-y-2">
            <p className="text-sm text-green-600">
              ✅ Google services are connected and ready to use!
            </p>
            <Button 
              variant="outline"
              onClick={connectGoogleServices}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? 'Reconnecting...' : 'Reconnect Services'}
            </Button>
          </div>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>Available Services:</strong></p>
          <p>• Google Drive (file access and management)</p>
          <p>• Gmail (email reading and sending)</p>
          <p>• Google Calendar (event management)</p>
          <p>• Google Sheets & Docs (document access)</p>
          <p>• Google Contacts (contact information)</p>
          <p>• Google Photos (photo library access)</p>
          <p>• YouTube (video and channel data)</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default GoogleServicesConnection;
