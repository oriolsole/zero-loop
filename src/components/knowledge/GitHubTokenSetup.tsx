
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ExternalLink, Github, Key, CheckCircle } from 'lucide-react';
import { userSecretService } from '@/services/userSecretService';
import { toast } from '@/components/ui/sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const GitHubTokenSetup: React.FC = () => {
  const [token, setToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  // Check if GitHub token already exists
  const { data: existingToken, isLoading } = useQuery({
    queryKey: ['userSecrets', 'github'],
    queryFn: () => userSecretService.fetchSecretsByProvider('github'),
  });

  const hasToken = existingToken && existingToken.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) return;

    setIsSubmitting(true);
    try {
      await userSecretService.createUserSecret({
        provider: 'github',
        key: token.trim(),
        label: 'GitHub Fine-grained Token'
      });

      toast.success('GitHub token saved successfully!');
      setToken('');
      queryClient.invalidateQueries({ queryKey: ['userSecrets', 'github'] });
    } catch (error) {
      toast.error('Failed to save GitHub token');
      console.error('Error saving GitHub token:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Github className="h-5 w-5" />
          GitHub Integration Setup
        </CardTitle>
        <CardDescription>
          Configure GitHub access for the AI agent to interact with repositories
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasToken ? (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              GitHub token is configured and ready to use! The AI agent can now access your GitHub repositories.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <Alert>
              <Key className="h-4 w-4" />
              <AlertDescription>
                You need to provide a GitHub fine-grained personal access token for the AI agent to access your repositories.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-2">How to create a GitHub fine-grained token:</h4>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Go to GitHub Settings → Developer settings → Personal access tokens → Fine-grained tokens</li>
                  <li>Click "Generate new token"</li>
                  <li>Set expiration and select the repositories you want to access</li>
                  <li>Grant the following permissions:
                    <ul className="ml-4 mt-1 list-disc list-inside">
                      <li>Contents: Read</li>
                      <li>Metadata: Read</li>
                      <li>Pull requests: Read (optional)</li>
                    </ul>
                  </li>
                  <li>Copy the generated token and paste it below</li>
                </ol>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open('https://github.com/settings/personal-access-tokens/new', '_blank')}
                className="flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Create GitHub Token
              </Button>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="github-token">GitHub Fine-grained Token</Label>
                  <Input
                    id="github-token"
                    type="password"
                    placeholder="github_pat_..."
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    className="font-mono"
                  />
                </div>
                
                <Button type="submit" disabled={!token.trim() || isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Save GitHub Token'}
                </Button>
              </form>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default GitHubTokenSetup;
