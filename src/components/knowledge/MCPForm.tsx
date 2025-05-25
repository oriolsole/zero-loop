
import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Trash2, Plus } from 'lucide-react';
import { Icons } from '@/components/icons';
import { MCP, MCPParameter } from '@/types/mcp';

const parameterSchema = z.object({
  name: z.string().min(1, 'Parameter name is required'),
  type: z.enum(['string', 'number', 'boolean', 'array', 'object']),
  description: z.string().optional(),
  required: z.boolean().default(true),
  default: z.any().optional(),
});

// Updated form schema with more flexible endpoint validation
const formSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  endpoint: z.string().min(1, 'Endpoint is required').refine(
    (value) => {
      // Allow edge function names (simple strings without special chars except hyphens/underscores)
      const edgeFunctionPattern = /^[a-zA-Z0-9_-]+$/;
      // Allow full URLs
      const urlPattern = /^https?:\/\/.+/;
      return edgeFunctionPattern.test(value) || urlPattern.test(value);
    },
    {
      message: "Endpoint must be either a valid URL (https://...) or an edge function name (e.g., 'google-search')",
    }
  ),
  icon: z.string().default('terminal'),
  parameters: z.array(parameterSchema).default([]),
});

type FormValues = z.infer<typeof formSchema>;

interface MCPFormProps {
  mcp: MCP | null;
  onSave: (mcp: MCP | Omit<MCP, 'id' | 'created_at' | 'updated_at'>) => void;
  onCancel: () => void;
}

const MCPForm: React.FC<MCPFormProps> = ({ mcp, onSave, onCancel }) => {
  const [selectedIcon, setSelectedIcon] = useState<string>(mcp?.icon || 'terminal');

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: mcp?.title || '',
      description: mcp?.description || '',
      endpoint: mcp?.endpoint || '',
      icon: mcp?.icon || 'terminal',
      parameters: mcp?.parameters || [],
    },
  });
  
  // Properly implement useFieldArray for parameters
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "parameters",
  });

  const handleSubmit = (values: FormValues) => {
    const validMcp: Omit<MCP, 'id' | 'created_at' | 'updated_at'> = {
      title: values.title,
      description: values.description,
      endpoint: values.endpoint,
      icon: values.icon,
      parameters: values.parameters.map(param => ({
        name: param.name,
        type: param.type,
        description: param.description || '',
        required: param.required,
        default: param.default
      })),
    };
    
    if (mcp?.id) {
      onSave({ ...validMcp, id: mcp.id, created_at: mcp.created_at, updated_at: mcp.updated_at });
    } else {
      onSave(validMcp);
    }
  };

  const addParameter = () => {
    const newParam: MCPParameter = {
      name: '',
      type: 'string',
      description: '',
      required: true,
    };
    append(newParam);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{mcp ? 'Edit MCP Tool' : 'Create New MCP Tool'}</CardTitle>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Web Search" {...field} />
                  </FormControl>
                  <FormDescription>
                    A descriptive name for your MCP tool
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Search the web using Google Custom Search API" 
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Explain what this tool does
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="endpoint"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Endpoint</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="google-search or https://api.example.com/endpoint" 
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Edge function name (e.g., 'google-search') or full URL to your MCP server
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Icon</FormLabel>
                  <Select 
                    value={field.value} 
                    onValueChange={(value) => {
                      field.onChange(value);
                      setSelectedIcon(value);
                    }}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an icon">
                          <div className="flex items-center">
                            {selectedIcon && React.createElement(Icons[selectedIcon as keyof typeof Icons] || Icons.zap, { className: "h-4 w-4 mr-2" })}
                            <span className="capitalize">{selectedIcon}</span>
                          </div>
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.keys(Icons).map((iconName) => (
                        <SelectItem key={iconName} value={iconName}>
                          <div className="flex items-center">
                            {React.createElement(Icons[iconName as keyof typeof Icons], { className: "h-4 w-4 mr-2" })}
                            <span className="capitalize">{iconName}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Choose an icon to represent this tool
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <div className="flex justify-between items-center mb-4">
                <FormLabel>Parameters</FormLabel>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={addParameter}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Parameter
                </Button>
              </div>
              
              <div className="space-y-4">
                {fields.length > 0 ? (
                  fields.map((field, index) => (
                    <div key={field.id} className="border p-4 rounded-md">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="text-sm font-medium">Parameter {index + 1}</h4>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => remove(index)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name={`parameters.${index}.name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Name</FormLabel>
                              <FormControl>
                                <Input placeholder="query" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name={`parameters.${index}.type`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Type</FormLabel>
                              <Select 
                                value={field.value} 
                                onValueChange={field.onChange}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="string">String</SelectItem>
                                  <SelectItem value="number">Number</SelectItem>
                                  <SelectItem value="boolean">Boolean</SelectItem>
                                  <SelectItem value="array">Array</SelectItem>
                                  <SelectItem value="object">Object</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={form.control}
                        name={`parameters.${index}.description`}
                        render={({ field }) => (
                          <FormItem className="mt-3">
                            <FormLabel className="text-xs">Description</FormLabel>
                            <FormControl>
                              <Input placeholder="The search query to find relevant web results" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name={`parameters.${index}.required`}
                        render={({ field }) => (
                          <FormItem className="mt-3 flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <Switch 
                                checked={field.value} 
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="text-xs font-normal">Required parameter</FormLabel>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 border-2 border-dashed rounded-md">
                    <p className="text-sm text-muted-foreground mb-2">No parameters added yet</p>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={addParameter}
                      className="flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add your first parameter
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="flex justify-between">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit">
              {mcp ? 'Update' : 'Create'} MCP
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
};

export default MCPForm;
