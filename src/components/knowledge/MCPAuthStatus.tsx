
import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle, Key, Loader2, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import { MCP } from '@/types/mcp';
import { CredentialValidationResult } from '@/services/mcpCredentialService';

interface MCPAuthStatusProps {
  mcp: MCP;
  isAuthenticated: boolean;
  validationResult: CredentialValidationResult | null;
  isValidating: boolean;
  onRetryValidation: () => void;
  onShowAuthModal: () => void;
}

const MCPAuthStatus: React.FC<MCPAuthStatusProps> = ({
  mcp,
  isAuthenticated,
  validationResult,
  isValidating,
  onRetryValidation,
  onShowAuthModal
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

  const renderValidationStatus = () => {
    if (!isAuthenticated) {
      return (
        <Alert variant="warning">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Authentication required</AlertTitle>
          <AlertDescription>
            You need to be signed in to execute this MCP and store execution history.
          </AlertDescription>
        </Alert>
      );
    }

    if (isValidating) {
      return (
        <Alert>
          <Loader2 className="h-4 w-4 animate-spin" />
          <AlertTitle>Checking credentials...</AlertTitle>
          <AlertDescription>
            Validating your authentication status for this tool.
          </AlertDescription>
        </Alert>
      );
    }

    if (!validationResult) {
      return (
        <Alert variant="warning">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Credential status unknown</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>Unable to determine authentication status.</p>
            <Button
              variant="outline"
              size="sm"
              onClick={onRetryValidation}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-3 w-3" />
              Check Status
            </Button>
          </AlertDescription>
        </Alert>
      );
    }

    if (validationResult.valid) {
      const getSuccessMessage = () => {
        if (mcp.endpoint === 'google-drive-tools') {
          return 'Google Drive OAuth connection is active and verified.';
        } else if (mcp.requirestoken) {
          return `${mcp.requirestoken} API key is configured and ready.`;
        } else {
          return 'No additional authentication required for this tool.';
        }
      };

      return (
        <Alert variant="default" className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Credentials Verified</AlertTitle>
          <AlertDescription className="text-green-700">
            {getSuccessMessage()}
            {validationResult.details?.message && (
              <div className="text-xs text-green-600 mt-1">
                {validationResult.details.message}
              </div>
            )}
          </AlertDescription>
        </Alert>
      );
    } else {
      const getErrorMessage = () => {
        if (mcp.endpoint === 'google-drive-tools') {
          return 'Google Drive connection is required but not found or invalid.';
        } else if (mcp.requirestoken) {
          return `${mcp.requirestoken} API key is required but not configured or invalid.`;
        } else {
          return 'Authentication is required but not properly configured.';
        }
      };

      return (
        <Alert variant="warning">
          <Key className="h-4 w-4" />
          <AlertTitle>Authentication Required</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>{getErrorMessage()}</p>
            {validationResult.error && (
              <div className="text-sm text-muted-foreground">
                Error: {validationResult.error}
              </div>
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onShowAuthModal}
                className="flex items-center gap-2"
              >
                <Key className="h-3 w-3" />
                Setup Authentication
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onRetryValidation}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-3 w-3" />
                Retry
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      );
    }
  };

  return (
    <div className="space-y-4">
      {getEndpointInfo()}
      {renderValidationStatus()}
    </div>
  );
};

export default MCPAuthStatus;
