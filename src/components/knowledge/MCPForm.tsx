
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { MCP } from '@/types/mcp';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Icons } from '@/components/icons';
import { Badge } from '@/components/ui/badge';

const parameterTypes = ['string', 'number', 'boolean', 'array', 'object'] as const;

const formSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  endpoint: z.string().url('Must be a valid URL'),
  icon: z.string().default('terminal'),
  parameters: z.array(z.object({
    name: z.string().min(1, 'Parameter name is required'),
    type: z.enum(parameterTypes),
    description: z.string().optional(),
    required: z.boolean().default(true),
    default: z.any().optional(),
  }))
});

type FormValues = z.infer<typeof formSchema>;

interface MCPFormProps {
  mcp: MCP | null;
  onSave: (mcp: MCP | Omit<MCP, 'id' | 'created_at' | 'updated_at'>) => void;
  onCancel: () => void;
}

const MCPForm: React.FC<MCPFormProps> = ({ mcp, onSave, onCancel }) => {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: mcp ? {
      title: mcp.title,
      description: mcp.description,
      endpoint: mcp.endpoint,
      icon: mcp.icon,
      parameters: mcp.parameters
    } : {
      title: '',
      description: '',
      endpoint: 'http://',
      icon: 'terminal',
      parameters: []
    }
  });
  
  const { fields, append, remove } = form.useFieldArray({
    name: 'parameters'
  });
  
  const handleSubmit = (values: FormValues) => {
    const mcpData = mcp ? { ...mcp, ...values } : values;
    onSave(mcpData);
  };
  
  const addParameter = () => {
    append({
      name: '',
      type: 'string',
      description: '',
      required: true
    });
  };
  
  const iconOptions = Object.keys(Icons);
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center">
          <Button variant="ghost" onClick={onCancel} className="mr-2 p-0 w-8 h-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <CardTitle>{mcp ? 'Edit' : 'Create'} MCP Tool</CardTitle>
        </div>
      </CardHeader>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Weather API" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="endpoint"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Endpoint URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://api.example.com/mcp" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Gets current weather data for a specified location" 
                      className="min-h-[80px]"
                      {...field} 
                    />
                  </FormControl>
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
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an icon" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {iconOptions.map((icon) => {
                        const IconComponent = Icons[icon as keyof typeof Icons];
                        return (
                          <SelectItem key={icon} value={icon} className="flex items-center gap-2">
                            <div className="flex items-center gap-2">
                              {IconComponent && <IconComponent className="h-4 w-4" />}
                              <span>{icon}</span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Parameters</h3>
                <Button 
                  type="button" 
                  onClick={addParameter} 
                  variant="outline" 
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Parameter
                </Button>
              </div>
              
              {fields.length === 0 ? (
                <div className="text-center py-6 border border-dashed rounded-md">
                  <p className="text-muted-foreground">No parameters added yet</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {fields.map((field, index) => (
                    <div key={field.id} className="p-4 border rounded-md relative space-y-4">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-2 h-8 w-8 p-0"
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      
                      <Badge className="absolute left-2 top-2">{index + 1}</Badge>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6">
                        <FormField
                          control={form.control}
                          name={`parameters.${index}.name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Parameter Name</FormLabel>
                              <FormControl>
                                <Input placeholder="city" {...field} />
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
                              <FormLabel>Type</FormLabel>
                              <Select 
                                onValueChange={field.onChange} 
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {parameterTypes.map((type) => (
                                    <SelectItem key={type} value={type}>
                                      {type}
                                    </SelectItem>
                                  ))}
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
                          <FormItem>
                            <FormLabel>Description (Optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="City name or location" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name={`parameters.${index}.required`}
                        render={({ field }) => (
                          <FormItem className="flex items-center gap-2 space-y-0">
                            <FormControl>
                              <input
                                type="checkbox"
                                checked={field.value}
                                onChange={field.onChange}
                                className="h-4 w-4"
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-normal">
                              Required parameter
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
          
          <CardFooter className="flex justify-between border-t pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit">
              {mcp ? 'Save Changes' : 'Create MCP'}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
};

export default MCPForm;
