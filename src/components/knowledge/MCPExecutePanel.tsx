
import React, { useState, useEffect } from 'react';
import { MCP } from '@/types/mcp';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import MCPAuthManager from './MCPAuthManager';
import { AlertTriangle, Key } from 'lucide-react';
import { userSecretService } from '@/services/userSecretService';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import { mcpService } from '@/services/mcpService';
import MCPExecuteForm from './MCPExecuteForm';
import MCPExecuteResults from './MCPExecuteResults';

interface MCPExecutePanelProps {
  mcp: MCP;
}

const MCPExecutePanel: React.FC<MCPExecutePanelProps> = ({ mcp }) => {
  const [result, setResult] = useState<Record<string, any> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [authMissing, setAuthMissing] = useState(false);
  const [requestInfo, setRequestInfo] = useState<string | null>(null);

  // Check for current user session
  const [session, setSession] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check authentication status
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setIsAuthenticated(!!data.session);
    };
    
    checkAuth();
  }, []);

  // Check if required API key is available for this MCP
  const { data: userSecrets, isLoading: secretsLoading } = useQuery({
    queryKey: ['userSecrets', mcp.requirestoken],
    queryFn: async () => {
      if (!mcp.requirestoken) return [];
      return await userSecretService.fetchSecretsByProvider(mcp.requirestoken);
    },
    enabled: !!mcp.requirestoken && isAuthenticated,
  });

  // Check if token is available
  useEffect(() => {
    if (mcp.requirestoken && userSecrets && userSecrets.length === 0 && !secretsLoading) {
      setAuthMissing(true);
    } else {
      setAuthMissing(false);
    }
  }, [mcp.requirestoken, userSecrets, secretsLoading]);

  // Display information about the endpoint being used
  const getEndpointInfo = () => {
    let endpoint = mcp.endpoint;
    // Check if this is a local function or external API
    const isLocalFunction = endpoint.includes('supabase') || 
                            !endpoint.includes('://') || 
                            endpoint.startsWith('/');
    
    return (
      <div className="text-xs text-muted-foreground flex items-center mb-2">
        <span className="mr-1">Endpoint:</span>
        {isLocalFunction ? (
          <span className="text-xs bg-primary/10 px-2 py-1 rounded">Edge Function</span>
        ) : (
          <div className="flex items-center">
            <span className="text-xs bg-secondary px-2 py-1 rounded mr-1">External API</span>
          </div>
        )}
      </div>
    );
  };

  const onSubmit = async (values: Record<string, any>) => {
    if (!isAuthenticated) {
      toast.error("Authentication required", {
        description: "You must be logged in to execute MCPs"
      });
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setResult(null);
    setRequestInfo(null);
    
    // Build debug info for the request
    const debugInfo = {
      endpoint: mcp.endpoint,
      parameters: values,
      requiresToken: mcp.requirestoken
    };
    setRequestInfo(JSON.stringify(debugInfo, null, 2));
    
    try {
      const response = await mcpService.executeMCP({
        mcpId: mcp.id,
        parameters: values
      });
      
      if (!response) {
        setError("No response received from MCP execution");
        return;
      }
      
      if (response.error) {
        setError(response.error);
        toast.error("Execution failed", {
          description: response.error
        });
      } else {
        setResult(response.data || response.result || { message: "Execution completed successfully" });
        toast.success("Execution completed", {
          description: "The MCP executed successfully"
        });
      }
    } catch (err: any) {
      setError(err.message || "An error occurred during execution");
      toast.error("Failed to execute MCP", {
        description: err.message || "Please try again or contact support"
      });
    } finally {
      setIsLoading(false);
    }
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
      
      {/* API Key warning */}
      {authMissing && (
        <Alert variant="warning">
          <Key className="h-4 w-4" />
          <AlertTitle>API Key Required</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>This MCP requires a {mcp.requirestoken} API key.</p>
            <MCPAuthManager 
              provider={mcp.requirestoken} 
              onCancel={() => {}} 
              authKeyName={mcp.requirestoken} 
              authType="api_key" 
            />
          </AlertDescription>
        </Alert>
      )}
      
      {/* Form */}
      <MCPExecuteForm
        mcp={mcp}
        onSubmit={onSubmit}
        isLoading={isLoading}
        isDisabled={authMissing || !isAuthenticated}
      />
      
      {/* Results */}
      <MCPExecuteResults
        result={result}
        error={error}
        requestInfo={requestInfo}
      />
    </div>
  );
};

export default MCPExecutePanel;
