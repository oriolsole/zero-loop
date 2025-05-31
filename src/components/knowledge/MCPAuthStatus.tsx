
import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle, Key } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ExternalLink } from 'lucide-react';
import MCPAuthManager from './MCPAuthManager';
import { MCP } from '@/types/mcp';

interface MCPAuthStatusProps {
  mcp: MCP;
  isAuthenticated: boolean;
  googleDriveConnected: boolean;
  authMissing: boolean;
  onAuthCancel: () => void;
}

const MCPAuthStatus: React.FC<MCPAuthStatusProps> = ({
  mcp,
  isAuthenticated,
  googleDriveConnected,
  authMissing,
  onAuthCancel
}) => {
  const getEndpointInfo = () => {
    let endpoint = mcp.endpoint;
    const isLocalFunction = endpoint.includes('supabase') || 
                            !endpoint.includes('://') || 
                            endpoint.startsWith('/');
    
    return (
      <div className="text-xs text-muted-foreground flex items-center mb-2">
        <span className="mr-1">Endpoint:</span>
        {isLocalFunction ? (
          <Badge variant="outline" className="text-xs">Edge Function</Badge>
        ) : (
          <div className="flex items-center">
            <Badge variant="outline" className="text-xs mr-1">External API</Badge>
            <ExternalLink className="h-3 w-3" />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Endpoint info */}
      {getEndpointInfo()}
      
      {/* Authentication warning */}
      {!isAuthenticated && (
        <Alert variant="warning">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Authentication required</AlertTitle>
          <AlertDescription>
            You need to be signed in to execute this MCP and store execution history.
          </AlertDescription>
        </Alert>
      )}

      {/* Google Drive OAuth Status */}
      {mcp.endpoint === 'google-drive-tools' && isAuthenticated && (
        <Alert variant={googleDriveConnected ? "default" : "warning"}>
          {googleDriveConnected ? (
            <>
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Google Drive Connected</AlertTitle>
              <AlertDescription>
                Using your existing Google Drive OAuth connection. No additional setup needed.
              </AlertDescription>
            </>
          ) : (
            <>
              <Key className="h-4 w-4" />
              <AlertTitle>Google Drive Connection Required</AlertTitle>
              <AlertDescription className="space-y-2">
                <p>This tool requires Google Drive access. Please connect your Google Drive account first.</p>
                <p className="text-sm text-muted-foreground">
                  Go to the Tools page and connect your Google Drive account via OAuth.
                </p>
              </AlertDescription>
            </>
          )}
        </Alert>
      )}
      
      {/* API Key warning for non-Google Drive tools */}
      {authMissing && mcp.endpoint !== 'google-drive-tools' && (
        <Alert variant="warning">
          <Key className="h-4 w-4" />
          <AlertTitle>API Key Required</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>This MCP requires a {mcp.requirestoken} API key.</p>
            <MCPAuthManager 
              provider={mcp.requirestoken} 
              onCancel={onAuthCancel} 
              authKeyName={mcp.requirestoken} 
              authType="api_key" 
            />
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default MCPAuthStatus;
