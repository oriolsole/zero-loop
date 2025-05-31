
import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { MCP } from '@/types/mcp';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface MCPParameterFormProps {
  mcp: MCP;
  form: UseFormReturn<any>;
  isLoading: boolean;
  authMissing: boolean;
  isAuthenticated: boolean;
  onSubmit: (values: any) => void;
}

const MCPParameterForm: React.FC<MCPParameterFormProps> = ({
  mcp,
  form,
  isLoading,
  authMissing,
  isAuthenticated,
  onSubmit
}) => {
  return (
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
          disabled={isLoading || (authMissing && mcp.endpoint !== 'google-drive-tools') || !isAuthenticated}
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
  );
};

export default MCPParameterForm;
