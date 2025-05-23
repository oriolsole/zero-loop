
import React, { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { MCP, MCPExecution, MCPParameter } from '@/types/mcp';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { mcpService } from '@/services/mcpService';
import { Loader2, Save, ShieldAlert, Key, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import MCPAuthManager from './MCPAuthManager';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { userSecretService } from '@/services/userSecretService';
import { useQuery } from '@tanstack/react-query';

interface MCPExecutePanelProps {
  mcp: MCP;
}

const MCPExecutePanel: React.FC<MCPExecutePanelProps> = ({ mcp }) => {
  const [isExecuting, setIsExecuting] = useState(false);
  const [execution, setExecution] = useState<MCPExecution | null>(null);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [nodeName, setNodeName] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('');
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [showTokenWarning, setShowTokenWarning] = useState(false);
  
  // Query for token if required by MCP
  const { 
    data: tokenData, 
    isLoading: tokenLoading 
  } = useQuery({
    queryKey: ['token', mcp.requiresToken],
    queryFn: () => userSecretService.fetchSecretsByProvider(mcp.requiresToken || ''),
    enabled: !!mcp.requiresToken,
  });

  // Check if the required token is missing
  useEffect(() => {
    if (mcp.requiresToken && !tokenLoading) {
      setShowTokenWarning(!tokenData || tokenData.length === 0);
    }
  }, [mcp.requiresToken, tokenData, tokenLoading]);
  
  // Dynamically build a zod schema based on MCP parameters
  const buildFormSchema = (parameters: MCPParameter[]) => {
    const schemaMap: Record<string, any> = {};
    
    parameters.forEach((param) => {
      let fieldSchema;
      
      switch (param.type) {
        case 'string':
          fieldSchema = z.string();
          break;
        case 'number':
          fieldSchema = z.string().refine((val) => !isNaN(Number(val)), {
            message: "Must be a number",
          }).transform(Number);
          break;
        case 'boolean':
          fieldSchema = z.boolean();
          break;
        case 'array':
          fieldSchema = z.string().transform((val) => val.split(',').map((item) => item.trim()));
          break;
        case 'object':
          fieldSchema = z.string().refine((val) => {
            try {
              JSON.parse(val);
              return true;
            } catch {
              return false;
            }
          }, {
            message: "Must be valid JSON",
          }).transform((val) => JSON.parse(val));
          break;
        default:
          fieldSchema = z.string();
      }
      
      if (!param.required) {
        fieldSchema = fieldSchema.optional();
      }
      
      schemaMap[param.name] = fieldSchema;
    });
    
    return z.object(schemaMap);
  };
  
  const formSchema = buildFormSchema(mcp.parameters);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: mcp.parameters.reduce((acc, param) => {
      if (param.default !== undefined) {
        acc[param.name] = param.default;
      } else if (param.type === 'boolean') {
        acc[param.name] = false;
      } else if (param.type === 'string' || param.type === 'number') {
        acc[param.name] = '';
      }
      return acc;
    }, {} as Record<string, any>)
  });
  
  const handleExecute = async (values: z.infer<typeof formSchema>) => {
    setIsExecuting(true);
    try {
      const result = await mcpService.executeMCP({
        mcpId: mcp.id,
        parameters: values
      });
      
      if (result) {
        setExecution(result);
        
        // If execution failed because of missing auth, show auth form
        if (result.status === 'failed' && 
            result.error && 
            result.error.includes('Authentication required') && 
            mcp.requiresAuth) {
          setShowAuthForm(true);
        }
        
        // If execution failed because of missing token, show token warning
        if (result.status === 'failed' && 
            result.error && 
            result.error.includes('Token required') && 
            mcp.requiresToken) {
          setShowTokenWarning(true);
        }
      }
    } catch (error) {
      console.error('Error executing MCP:', error);
    } finally {
      setIsExecuting(false);
    }
  };
  
  const handleSaveAsKnowledgeNode = async () => {
    if (!execution) return;
    
    await mcpService.saveResultAsKnowledgeNode(
      execution,
      selectedDomain,
      nodeName
    );
    
    setShowSaveForm(false);
  };
  
  const renderExecutionResult = () => {
    if (!execution) return null;
    
    const { status, result, error } = execution;
    
    return (
      <div className="space-y-4 mt-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Result</h3>
          <Badge variant={status === 'completed' ? 'default' : 'destructive'}>
            {status}
          </Badge>
        </div>
        
        {error ? (
          <div className="bg-destructive/10 text-destructive p-4 rounded-md">
            {error}
          </div>
        ) : (
          <Card className="p-4">
            <ScrollArea className="h-[200px]">
              <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
            </ScrollArea>
          </Card>
        )}
        
        {status === 'completed' && (
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => setShowSaveForm(true)}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              Save as Knowledge Node
            </Button>
          </div>
        )}
      </div>
    );
  };
  
  const renderSaveForm = () => {
    if (!showSaveForm) return null;
    
    return (
      <div className="space-y-4 mt-4 border-t pt-4">
        <h3 className="text-lg font-medium">Save as Knowledge Node</h3>
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="node-name">Node Title</Label>
            <Input
              id="node-name"
              value={nodeName}
              onChange={(e) => setNodeName(e.target.value)}
              placeholder="Enter a title for this knowledge node"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="domain">Domain</Label>
            <Select
              value={selectedDomain}
              onValueChange={setSelectedDomain}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a domain" />
              </SelectTrigger>
              <SelectContent>
                {/* This would be populated from your domains */}
                <SelectItem value="default">Default Domain</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowSaveForm(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveAsKnowledgeNode} disabled={!nodeName || !selectedDomain}>
              Save
            </Button>
          </div>
        </div>
      </div>
    );
  };
  
  // If auth form should be displayed, show it
  if (showAuthForm) {
    return (
      <MCPAuthManager
        authKeyName={mcp.authKeyName || 'API Key'} 
        authType={mcp.authType || 'api_key'}
        onCancel={() => setShowAuthForm(false)}
      />
    );
  }

  // If MCP requires auth and has auth requirements specified, show auth banner
  const renderAuthBanner = () => {
    if (mcp.requiresAuth && mcp.authKeyName) {
      return (
        <Alert variant="warning" className="mb-4">
          <ShieldAlert className="h-5 w-5" />
          <AlertTitle>Authentication Required</AlertTitle>
          <AlertDescription>
            This MCP requires authentication using <span className="font-semibold">{mcp.authKeyName}</span>.
            {mcp.authType === 'api_key' && " Please ensure you've configured your API key."}
          </AlertDescription>
        </Alert>
      );
    }
    return null;
  };
  
  // If MCP requires a token and it's missing, show token warning
  const renderTokenBanner = () => {
    if (showTokenWarning && mcp.requiresToken) {
      return (
        <Alert variant="warning" className="mb-4">
          <Key className="h-5 w-5" />
          <AlertTitle>API Token Required</AlertTitle>
          <AlertDescription>
            This MCP requires a <span className="font-semibold">{mcp.requiresToken}</span> API token. 
            Please add your token in the API Token Manager before executing.
          </AlertDescription>
        </Alert>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      {renderAuthBanner()}
      {renderTokenBanner()}
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleExecute)} className="space-y-4">
          {mcp.parameters.map((param) => (
            <FormField
              key={param.name}
              control={form.control}
              name={param.name}
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>
                      {param.name}
                      {param.required && <span className="text-destructive ml-1">*</span>}
                    </FormLabel>
                    <Badge variant="outline">{param.type}</Badge>
                  </div>
                  <FormControl>
                    {param.type === 'boolean' ? (
                      <div className="flex items-center space-x-2">
                        <Switch 
                          checked={field.value} 
                          onCheckedChange={field.onChange} 
                        />
                        <span className="text-sm text-muted-foreground">
                          {field.value ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    ) : param.type === 'object' ? (
                      <Textarea 
                        placeholder={`Enter valid JSON for ${param.name}`}
                        {...field}
                      />
                    ) : (
                      <Input 
                        placeholder={param.description || `Enter ${param.name}`}
                        {...field}
                        value={typeof field.value === 'string' ? field.value : ''}
                      />
                    )}
                  </FormControl>
                  {param.description && (
                    <FormDescription>{param.description}</FormDescription>
                  )}
                </FormItem>
              )}
            />
          ))}
          
          <div className="flex justify-end">
            <Button 
              type="submit" 
              disabled={isExecuting || (mcp.requiresToken && showTokenWarning)}
            >
              {isExecuting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                  Executing...
                </>
              ) : (
                'Execute MCP'
              )}
            </Button>
          </div>
        </form>
      </Form>
      
      {renderExecutionResult()}
      {renderSaveForm()}
    </div>
  );
};

export default MCPExecutePanel;
