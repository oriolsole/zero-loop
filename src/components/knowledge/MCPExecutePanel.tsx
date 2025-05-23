import React, { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { MCP } from '@/types/mcp';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { mcpService } from '@/services/mcpService';
import { Loader2, Save, ShieldAlert, Key, AlertTriangle, ExternalLink } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import MCPAuthManager from './MCPAuthManager';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { userSecretService } from '@/services/userSecretService';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';

interface MCPExecutePanelProps {
  mcp: MCP;
}

const MCPExecutePanel: React.FC<MCPExecutePanelProps> = ({ mcp }) => {
  const [result, setResult] = useState<Record<string, any> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [authMissing, setAuthMissing] = useState(false);

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
          <Badge variant="outline" className="text-xs">Local Function</Badge>
        ) : (
          <div className="flex items-center">
            <Badge variant="outline" className="text-xs mr-1">External API</Badge>
            <ExternalLink className="h-3 w-3" />
          </div>
        )}
      </div>
    );
  };

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
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {mcp.parameters.map((param, index) => (
            <FormField
              key={index}
              control={form.control}
              name={param.name}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {param.name}
                    {param.required && <span className="text-red-500 ml-1">*</span>}
                  </FormLabel>
                  
                  {param.type === 'boolean' ? (
                    <FormControl>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                        <Label htmlFor={param.name}>{field.value ? 'Enabled' : 'Disabled'}</Label>
                      </div>
                    </FormControl>
                  ) : param.type === 'string' && param.enum ? (
                    <Select 
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select option" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {param.enum.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : param.type === 'string' && param.name.toLowerCase().includes('prompt') ? (
                    <FormControl>
                      <Textarea 
                        {...field} 
                        className="min-h-[100px]"
                        placeholder={`Enter ${param.name}`}
                      />
                    </FormControl>
                  ) : (
                    <FormControl>
                      <Input
                        {...field}
                        type={param.type === 'number' ? 'number' : 'text'}
                        placeholder={`Enter ${param.name}`}
                        value={field.value ?? ''}
                        onChange={e => {
                          const value = param.type === 'number'
                            ? parseFloat(e.target.value)
                            : e.target.value;
                          field.onChange(value);
                        }}
                      />
                    </FormControl>
                  )}
                  
                  {param.description && (
                    <FormDescription>{param.description}</FormDescription>
                  )}
                </FormItem>
              )}
            />
          ))}
          
          <Button 
            type="submit" 
            disabled={isLoading || authMissing || !isAuthenticated}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Executing...
              </>
            ) : (
              'Execute'
            )}
          </Button>
        </form>
      </Form>
      
      {/* Results display */}
      {result && (
        <Card className="mt-4">
          <div className="p-4">
            <h3 className="text-lg font-medium mb-2">Result:</h3>
            <ScrollArea className="h-[200px] rounded-md border p-4">
              <pre className="text-sm font-mono whitespace-pre-wrap">
                {JSON.stringify(result, null, 2)}
              </pre>
            </ScrollArea>
          </div>
        </Card>
      )}
      
      {/* Error display */}
      {error && (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription className="whitespace-pre-wrap">{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default MCPExecutePanel;
