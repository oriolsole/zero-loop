
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Key, ExternalLink, RefreshCw } from 'lucide-react';
import { MCP } from '@/types/mcp';
import MCPAuthManager from './MCPAuthManager';
import { mcpCredentialService } from '@/services/mcpCredentialService';

interface MCPAuthModalProps {
  mcp: MCP;
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: () => void;
  validationError?: string;
}

const MCPAuthModal: React.FC<MCPAuthModalProps> = ({
  mcp,
  isOpen,
  onClose,
  onAuthSuccess,
  validationError
}) => {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetryValidation = async () => {
    setIsRetrying(true);
    try {
      const result = await mcpCredentialService.forceRevalidate(mcp.endpoint, mcp.requirestoken);
      if (result.valid) {
        onAuthSuccess();
        onClose();
      }
    } catch (error) {
      console.error('Retry validation failed:', error);
    } finally {
      setIsRetrying(false);
    }
  };

  const getModalContent = () => {
    if (mcp.endpoint === 'google-drive-tools') {
      return {
        title: 'Google Drive Connection Required',
        description: 'This tool requires access to your Google Drive. Please connect your Google account.',
        icon: <ExternalLink className="h-5 w-5" />
      };
    } else if (mcp.requirestoken) {
      return {
        title: `${mcp.requirestoken} API Key Required`,
        description: `This tool requires a ${mcp.requirestoken} API key to function.`,
        icon: <Key className="h-5 w-5" />
      };
    } else {
      return {
        title: 'Authentication Required',
        description: 'This tool requires authentication to function properly.',
        icon: <Key className="h-5 w-5" />
      };
    }
  };

  const content = getModalContent();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {content.icon}
            {content.title}
          </DialogTitle>
          <DialogDescription>
            {content.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {validationError && (
            <Alert variant="destructive">
              <AlertDescription>{validationError}</AlertDescription>
            </Alert>
          )}

          <MCPAuthManager
            provider={mcp.requirestoken || 'google-drive-tools'}
            onCancel={onClose}
            authKeyName={mcp.requirestoken}
            authType={mcp.endpoint === 'google-drive-tools' ? 'oauth' : 'api_key'}
          />

          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={handleRetryValidation}
              disabled={isRetrying}
              className="flex items-center gap-2"
            >
              {isRetrying ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Check Again
            </Button>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MCPAuthModal;
