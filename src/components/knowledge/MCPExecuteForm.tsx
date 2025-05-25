
import React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { MCP } from '@/types/mcp';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

interface MCPExecuteFormProps {
  mcp: MCP;
  onSubmit: (values: Record<string, any>) => void;
  isLoading: boolean;
  isDisabled: boolean;
}

const MCPExecuteForm: React.FC<MCPExecuteFormProps> = ({ mcp, onSubmit, isLoading, isDisabled }) => {
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
          disabled={isLoading || isDisabled}
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

export default MCPExecuteForm;
