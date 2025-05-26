
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ExternalLink, Info, CheckCircle2 } from 'lucide-react';
import { userSecretService } from '@/services/userSecretService';
import { toast } from '@/components/ui/sonner';

const jiraConfigSchema = z.object({
  baseUrl: z.string().url('Please enter a valid URL').refine(
    (url) => url.includes('atlassian.net') || url.includes('jira'),
    'URL should be your Jira instance URL'
  ),
  email: z.string().email('Please enter a valid email address'),
  apiToken: z.string().min(1, 'API token is required'),
});

type JiraConfigForm = z.infer<typeof jiraConfigSchema>;

interface JiraConfigHelperProps {
  onConfigSaved?: () => void;
}

const JiraConfigHelper: React.FC<JiraConfigHelperProps> = ({ onConfigSaved }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);

  const form = useForm<JiraConfigForm>({
    resolver: zodResolver(jiraConfigSchema),
    defaultValues: {
      baseUrl: '',
      email: '',
      apiToken: '',
    },
  });

  const onSubmit = async (data: JiraConfigForm) => {
    setIsLoading(true);
    try {
      // Create the configuration object
      const jiraConfig = {
        baseUrl: data.baseUrl.replace(/\/$/, ''), // Remove trailing slash
        email: data.email,
        apiToken: data.apiToken,
      };

      // Save as a JSON string in user secrets
      const secret = await userSecretService.createUserSecret({
        provider: 'jira',
        key: JSON.stringify(jiraConfig),
        label: 'Jira Configuration',
      });

      if (secret) {
        setIsConfigured(true);
        toast.success('Jira configuration saved successfully!');
        onConfigSaved?.();
      }
    } catch (error) {
      console.error('Error saving Jira configuration:', error);
      toast.error('Failed to save Jira configuration');
    } finally {
      setIsLoading(false);
    }
  };

  if (isConfigured) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Jira Configuration Complete
          </CardTitle>
          <CardDescription>
            Your Jira integration is now configured and ready to use.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configure Jira Integration</CardTitle>
        <CardDescription>
          Set up your Jira connection to manage projects and issues
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Required Information</AlertTitle>
          <AlertDescription>
            You'll need your Jira instance URL, email address, and an API token to connect.
          </AlertDescription>
        </Alert>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="baseUrl">Jira Instance URL</Label>
            <Input
              id="baseUrl"
              placeholder="https://your-domain.atlassian.net"
              {...form.register('baseUrl')}
            />
            {form.formState.errors.baseUrl && (
              <p className="text-sm text-red-600">{form.formState.errors.baseUrl.message}</p>
            )}
            <p className="text-sm text-muted-foreground">
              Your Jira Cloud instance URL (e.g., https://company.atlassian.net)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="your-email@example.com"
              {...form.register('email')}
            />
            {form.formState.errors.email && (
              <p className="text-sm text-red-600">{form.formState.errors.email.message}</p>
            )}
            <p className="text-sm text-muted-foreground">
              The email address associated with your Jira account
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="apiToken">API Token</Label>
            <Input
              id="apiToken"
              type="password"
              placeholder="Your Jira API token"
              {...form.register('apiToken')}
            />
            {form.formState.errors.apiToken && (
              <p className="text-sm text-red-600">{form.formState.errors.apiToken.message}</p>
            )}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Get your API token from Atlassian</span>
              <a
                href="https://id.atlassian.com/manage-profile/security/api-tokens"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800"
              >
                Create API Token
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? 'Saving Configuration...' : 'Save Jira Configuration'}
          </Button>
        </form>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Security Note</AlertTitle>
          <AlertDescription>
            Your credentials are stored securely and encrypted. They are only used to authenticate with your Jira instance.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default JiraConfigHelper;
