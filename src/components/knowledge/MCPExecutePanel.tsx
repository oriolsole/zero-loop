
import React, { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { MCP } from '@/types/mcp';
import { mcpService } from '@/services/mcpService';
import { mcpCredentialService, CredentialValidationResult } from '@/services/mcpCredentialService';
import { toast } from '@/components/ui/sonner';
import { useAuth } from '@/contexts/AuthContext';
import MCPAuthStatus from './MCPAuthStatus';
import MCPParameterForm from './MCPParameterForm';
import MCPExecutionResults from './MCPExecutionResults';
import MCPAuthModal from './MCPAuthModal';

interface MCPExecutePanelProps {
  mcp: MCP;
}

const MCPExecutePanel: React.FC<MCPExecutePanelProps> = ({ mcp }) => {
  const [result, setResult] = useState<Record<string, any> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [requestInfo, setRequestInfo] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<CredentialValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const { user } = useAuth();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    setIsAuthenticated(!!user);
  }, [user]);

  // Validate credentials when component mounts or when authentication changes
  useEffect(() => {
    if (isAuthenticated) {
      validateCredentials();
    } else {
      setValidationResult(null);
    }
  }, [isAuthenticated, mcp.endpoint, mcp.requirestoken]);

  const validateCredentials = async () => {
    if (!isAuthenticated) return;
    
    setIsValidating(true);
    try {
      const result = await mcpCredentialService.validateCredentials(mcp.endpoint, mcp.requirestoken);
      setValidationResult(result);
      console.log(`🔍 Validation result for ${mcp.endpoint}:`, result);
    } catch (error) {
      console.error('Failed to validate credentials:', error);
      setValidationResult({
        valid: false,
        service: mcp.endpoint,
        error: 'Failed to validate credentials'
      });
    } finally {
      setIsValidating(false);
    }
  };

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

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!isAuthenticated) {
      toast.error("Authentication required", {
        description: "You must be logged in to execute MCPs"
      });
      return;
    }

    // Final credential validation before execution
    setIsValidating(true);
    const finalValidation = await mcpCredentialService.forceRevalidate(mcp.endpoint, mcp.requirestoken);
    setValidationResult(finalValidation);
    setIsValidating(false);

    if (!finalValidation.valid) {
      toast.error("Authentication required", {
        description: finalValidation.error || "Invalid credentials"
      });
      setShowAuthModal(true);
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
      validationResult: finalValidation
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

  const handleAuthSuccess = () => {
    // Clear cache and revalidate
    mcpCredentialService.clearCache(mcp.endpoint);
    validateCredentials();
    toast.success("Authentication successful", {
      description: "You can now execute this tool"
    });
  };

  const handleAuthCancel = () => {
    setShowAuthModal(false);
  };

  return (
    <div className="space-y-4">
      <MCPAuthStatus
        mcp={mcp}
        isAuthenticated={isAuthenticated}
        validationResult={validationResult}
        isValidating={isValidating}
        onRetryValidation={validateCredentials}
        onShowAuthModal={() => setShowAuthModal(true)}
      />
      
      <MCPParameterForm
        mcp={mcp}
        form={form}
        isLoading={isLoading || isValidating}
        validationResult={validationResult}
        isAuthenticated={isAuthenticated}
        onSubmit={onSubmit}
      />
      
      <MCPExecutionResults
        requestInfo={requestInfo}
        result={result}
        error={error}
      />

      <MCPAuthModal
        mcp={mcp}
        isOpen={showAuthModal}
        onClose={handleAuthCancel}
        onAuthSuccess={handleAuthSuccess}
        validationError={validationResult?.error}
      />
    </div>
  );
};

export default MCPExecutePanel;
