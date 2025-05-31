
import React, { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { MCP } from '@/types/mcp';
import { mcpService } from '@/services/mcpService';
import { userSecretService } from '@/services/userSecretService';
import { useQuery } from '@tanstack/react-query';
import { toast } from '@/components/ui/sonner';
import { useAuth } from '@/contexts/AuthContext';
import MCPAuthStatus from './MCPAuthStatus';
import MCPParameterForm from './MCPParameterForm';
import MCPExecutionResults from './MCPExecutionResults';

interface MCPExecutePanelProps {
  mcp: MCP;
}

const MCPExecutePanel: React.FC<MCPExecutePanelProps> = ({ mcp }) => {
  const [result, setResult] = useState<Record<string, any> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [authMissing, setAuthMissing] = useState(false);
  const [requestInfo, setRequestInfo] = useState<string | null>(null);
  const [googleDriveConnected, setGoogleDriveConnected] = useState(false);

  const { user, profile } = useAuth();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    setIsAuthenticated(!!user);
  }, [user]);

  // Enhanced Google Drive OAuth connection check with comprehensive debugging
  useEffect(() => {
    const checkGoogleDriveConnection = () => {
      if (mcp.endpoint === 'google-drive-tools' && profile) {
        console.log('🔍 COMPREHENSIVE Google Drive connection check for profile:', profile);
        console.log('🔍 Profile keys available:', Object.keys(profile || {}));
        console.log('🔍 All profile data:', JSON.stringify(profile, null, 2));
        
        // Method 1: Check explicit google_drive_connected flag
        const hasGoogleDriveFlag = profile.google_drive_connected;
        console.log('🔍 Method 1 - google_drive_connected flag:', hasGoogleDriveFlag);
        
        // Method 2: Check google_services_connected array for variations
        const googleServices = profile.google_services_connected || [];
        console.log('🔍 Method 2 - google_services_connected array:', googleServices);
        const hasGoogleDriveService = googleServices.some((service: string) => 
          service && (
            service.toLowerCase().includes('drive') ||
            service.toLowerCase().includes('google-drive') ||
            service === 'google-drive-tools'
          )
        );
        console.log('🔍 Method 2 - service array contains drive:', hasGoogleDriveService);
        
        // Method 3: Check google_scopes_granted for Drive-related scopes
        const googleScopes = profile.google_scopes_granted || [];
        console.log('🔍 Method 3 - google_scopes_granted array:', googleScopes);
        const hasDriveScopes = googleScopes.some((scope: string) => 
          scope && scope.includes('drive')
        );
        console.log('🔍 Method 3 - scopes contain drive:', hasDriveScopes);
        
        // Method 4: Check for any OAuth tokens in profile
        const profileData = profile as any;
        const hasGoogleAccessToken = !!(
          profileData.google_access_token || 
          profileData.google_refresh_token ||
          profileData.oauth_tokens?.google
        );
        console.log('🔍 Method 4 - has Google OAuth tokens:', hasGoogleAccessToken);
        
        // Method 5: Check if user has Google ID (signed in with Google)
        const hasGoogleId = !!(profile.google_id || profileData.google_id);
        console.log('🔍 Method 5 - has Google ID:', hasGoogleId);
        
        // Method 6: Check all profile properties for any Google-related data
        const profileString = JSON.stringify(profile).toLowerCase();
        const hasAnyGoogleData = profileString.includes('google') && profileString.includes('drive');
        console.log('🔍 Method 6 - profile contains Google+Drive data:', hasAnyGoogleData);
        
        // Final determination - if ANY method indicates connection, consider it connected
        const isConnected = hasGoogleDriveFlag || 
                           hasGoogleDriveService || 
                           hasDriveScopes || 
                           hasGoogleAccessToken ||
                           (hasGoogleId && hasAnyGoogleData);
        
        console.log('🔍 FINAL DETERMINATION:', {
          hasGoogleDriveFlag,
          hasGoogleDriveService,
          hasDriveScopes,
          hasGoogleAccessToken,
          hasGoogleId,
          hasAnyGoogleData,
          finalResult: isConnected
        });
        
        setGoogleDriveConnected(isConnected);
        
        if (isConnected) {
          console.log('✅ Google Drive detected as CONNECTED');
        } else {
          console.log('❌ Google Drive detected as NOT CONNECTED');
        }
      }
    };

    checkGoogleDriveConnection();
  }, [mcp.endpoint, profile]);

  // Check if required API key is available for this MCP
  const { data: userSecrets, isLoading: secretsLoading } = useQuery({
    queryKey: ['userSecrets', mcp.requirestoken],
    queryFn: async () => {
      if (!mcp.requirestoken) return [];
      return await userSecretService.fetchSecretsByProvider(mcp.requirestoken);
    },
    enabled: !!mcp.requirestoken && isAuthenticated && !googleDriveConnected,
  });

  // Create a dynamic form schema based on the MCP parameters
  const generateFormSchema = () => {
    const schemaMap: Record<string, any> = {};
    
    mcp.parameters.forEach(param => {
      switch (param.type) {
        case 'string':
          schemaMap[param.name] = param.required ? z.string().min(1, { message: "Required" }) : z.string().optional();
          break;
        case 'number':
          schemaMap[param.name] = param.required ? z.number() : z.number().optional();
          break;
        case 'boolean':
          schemaMap[param.name] = z.boolean().optional();
          break;
        case 'array':
          schemaMap[param.name] = param.required ? z.string() : z.string().optional();
          break;
        case 'object':
          schemaMap[param.name] = param.required ? z.string() : z.string().optional();
          break;
        default:
          schemaMap[param.name] = z.string().optional();
      }
    });
    
    return z.object(schemaMap);
  };
  
  const formSchema = generateFormSchema();
  
  // Get default values from MCP parameters
  const getDefaultValues = () => {
    const defaults: Record<string, any> = {};
    
    mcp.parameters.forEach(param => {
      defaults[param.name] = param.default !== undefined ? param.default : 
        param.type === 'boolean' ? false : 
        param.type === 'number' ? 0 : '';
    });
    
    return defaults;
  };

  // Create form with validation
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: getDefaultValues(),
  });

  // Updated auth missing check - for Google Drive, only require token if OAuth is not connected
  useEffect(() => {
    if (mcp.endpoint === 'google-drive-tools') {
      // For Google Drive tools, only require token if OAuth is not connected
      const missingAuth = !googleDriveConnected;
      console.log('🔑 Google Drive auth missing check:', { 
        googleDriveConnected, 
        missingAuth,
        mcpEndpoint: mcp.endpoint 
      });
      setAuthMissing(missingAuth);
    } else if (mcp.requirestoken && userSecrets && userSecrets.length === 0 && !secretsLoading) {
      setAuthMissing(true);
    } else {
      setAuthMissing(false);
    }
  }, [mcp.requirestoken, mcp.endpoint, userSecrets, secretsLoading, googleDriveConnected]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
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
      requiresToken: mcp.requirestoken,
      googleDriveConnected: googleDriveConnected
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

  const handleAuthCancel = () => {
    // Handle auth manager cancellation if needed
  };

  return (
    <div className="space-y-4">
      <MCPAuthStatus
        mcp={mcp}
        isAuthenticated={isAuthenticated}
        googleDriveConnected={googleDriveConnected}
        authMissing={authMissing}
        onAuthCancel={handleAuthCancel}
      />
      
      <MCPParameterForm
        mcp={mcp}
        form={form}
        isLoading={isLoading}
        authMissing={authMissing}
        isAuthenticated={isAuthenticated}
        onSubmit={onSubmit}
      />
      
      <MCPExecutionResults
        requestInfo={requestInfo}
        result={result}
        error={error}
      />
    </div>
  );
};

export default MCPExecutePanel;
