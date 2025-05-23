
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { UserSecret } from '@/types/mcp';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface TokenFormProps {
  secret?: UserSecret | null;
  onSave: (data: any) => void;
  onCancel: () => void;
  defaultProvider?: string;
}

const TokenForm: React.FC<TokenFormProps> = ({ 
  secret,
  onSave,
  onCancel,
  defaultProvider = 'github'
}) => {
  // Define form schema
  const formSchema = z.object({
    provider: z.string().min(1, 'Provider is required'),
    label: z.string().optional(),
    key: secret ? z.string().optional() : z.string().min(1, 'API token is required'),
  });

  // Initialize form with defaults
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      provider: secret?.provider || defaultProvider,
      label: secret?.label || '',
      key: '',
    },
  });
  
  // List of supported providers
  const providers = [
    { id: 'github', name: 'GitHub' },
    { id: 'openai', name: 'OpenAI' },
    { id: 'google', name: 'Google API' },
    { id: 'azure', name: 'Azure' },
    { id: 'aws', name: 'AWS' },
    { id: 'stripe', name: 'Stripe' },
    { id: 'custom', name: 'Custom' },
  ];

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    onSave(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Provider field */}
        <FormField
          control={form.control}
          name="provider"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Provider</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={!!secret} // Can't change provider for existing secrets
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a provider" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {providers.map(provider => (
                    <SelectItem key={provider.id} value={provider.id}>
                      {provider.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Select the service this token is for
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Label field */}
        <FormField
          control={form.control}
          name="label"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Label (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Production, Personal" {...field} />
              </FormControl>
              <FormDescription>
                A descriptive name for this token
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* API Key/Token field */}
        <FormField
          control={form.control}
          name="key"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{secret ? 'New API Token' : 'API Token'}</FormLabel>
              <FormControl>
                <Input 
                  type="password" 
                  placeholder="Enter your API token" 
                  {...field} 
                  required={!secret}
                />
              </FormControl>
              <FormDescription>
                {secret 
                  ? 'Leave blank to keep the current token. For security, existing tokens cannot be viewed.' 
                  : 'Your API token will be stored securely and never exposed in the UI after saving.'
                }
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            {secret ? 'Update Token' : 'Save Token'}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default TokenForm;
