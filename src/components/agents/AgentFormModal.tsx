import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Agent } from '@/services/agentService';
import { getOpenAIModels, getNpawModels, getModelSettings } from '@/services/modelProviderService';

const agentSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  model: z.string().min(1, 'Model is required'),
  system_prompt: z.string().max(5000, 'System prompt must be less than 5000 characters').optional(),
  loop_enabled: z.boolean(),
  is_default: z.boolean().optional(),
});

type AgentFormData = z.infer<typeof agentSchema>;

interface AgentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: AgentFormData) => Promise<void>;
  mode: 'create' | 'edit';
  agent?: Agent | null;
}

const AgentFormModal: React.FC<AgentFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  mode,
  agent,
}) => {
  // Get all available models dynamically
  const openAIModels = getOpenAIModels();
  const npawModels = getNpawModels();
  const currentSettings = getModelSettings();
  
  // Group models by category for better organization
  const modelsByProvider = {
    openai: openAIModels,
    npaw: npawModels,
  };

  const form = useForm<AgentFormData>({
    resolver: zodResolver(agentSchema),
    defaultValues: {
      name: agent?.name || '',
      description: agent?.description || '',
      model: agent?.model || currentSettings.selectedModel || 'gpt-4o',
      system_prompt: agent?.system_prompt || '',
      loop_enabled: agent?.loop_enabled || false,
      is_default: agent?.is_default || false,
    },
  });

  // Reset form when agent changes - with debugging
  React.useEffect(() => {
    if (isOpen) {
      console.log('🔧 [FORM DEBUG] Modal opened, resetting form with agent data:');
      console.log('🔧 [FORM DEBUG] Agent object:', agent);
      console.log('🔧 [FORM DEBUG] Agent system_prompt:', agent?.system_prompt);
      console.log('🔧 [FORM DEBUG] Mode:', mode);
      
      const formData = {
        name: agent?.name || '',
        description: agent?.description || '',
        model: agent?.model || currentSettings.selectedModel || 'gpt-4o',
        system_prompt: agent?.system_prompt || '',
        loop_enabled: agent?.loop_enabled || false,
        is_default: agent?.is_default || false,
      };
      
      console.log('🔧 [FORM DEBUG] Form data being set:', formData);
      
      form.reset(formData);
      
      // Verify the form actually got the values
      setTimeout(() => {
        const currentValues = form.getValues();
        console.log('🔧 [FORM DEBUG] Form values after reset:', currentValues);
        console.log('🔧 [FORM DEBUG] System prompt field value:', currentValues.system_prompt);
      }, 100);
    }
  }, [agent, isOpen, form, currentSettings.selectedModel, mode]);

  const handleSubmit = async (data: AgentFormData) => {
    console.log('🔧 [FORM DEBUG] Form submitted with data:', data);
    try {
      await onSubmit(data);
      form.reset();
    } catch (error) {
      console.error('Error submitting agent form:', error);
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  const getProviderBadgeColor = (provider: string) => {
    switch (provider) {
      case 'openai':
        return 'bg-green-500/10 text-green-700 border-green-200';
      case 'npaw':
        return 'bg-blue-500/10 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-500/10 text-gray-700 border-gray-200';
    }
  };

  const getProviderLabel = (provider: string) => {
    switch (provider) {
      case 'openai':
        return 'OpenAI';
      case 'npaw':
        return 'NPAW';
      default:
        return provider.toUpperCase();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Create New Agent' : 'Edit Agent'}
            {mode === 'edit' && agent && (
              <span className="text-sm font-normal text-muted-foreground block">
                Editing: {agent.name}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Research Assistant" {...field} />
                  </FormControl>
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
                      placeholder="Describe what this agent is designed to do..."
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
              name="model"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Model *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a model" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(modelsByProvider).map(([provider, models]) => (
                        <SelectGroup key={provider}>
                          <SelectLabel className="flex items-center gap-2">
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${getProviderBadgeColor(provider)}`}
                            >
                              {getProviderLabel(provider)}
                            </Badge>
                          </SelectLabel>
                          {models.map((model) => (
                            <SelectItem key={model.id} value={model.id}>
                              <div className="flex flex-col">
                                <span>{model.name}</span>
                                {model.description && (
                                  <span className="text-xs text-muted-foreground">
                                    {model.description}
                                  </span>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="system_prompt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Custom System Prompt</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Optional: Add a custom system prompt to define the agent's behavior..."
                      className="min-h-[100px]"
                      {...field}
                      onChange={(e) => {
                        console.log('🔧 [FORM DEBUG] System prompt changed:', e.target.value);
                        field.onChange(e);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                  {mode === 'edit' && (
                    <div className="text-xs text-muted-foreground">
                      Current value: {field.value ? `"${field.value.substring(0, 100)}${field.value.length > 100 ? '...' : ''}"` : 'Empty'}
                    </div>
                  )}
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="loop_enabled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Self-Improvement</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Allow this agent to reflect and improve its responses
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {mode === 'edit' && (
              <FormField
                control={form.control}
                name="is_default"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Default Agent</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Set as the default agent for new conversations
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting 
                  ? (mode === 'create' ? 'Creating...' : 'Updating...')
                  : (mode === 'create' ? 'Create Agent' : 'Update Agent')
                }
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AgentFormModal;
