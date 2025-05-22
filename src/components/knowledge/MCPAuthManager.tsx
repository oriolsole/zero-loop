
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Key, Save, X } from 'lucide-react';
import { mcpService } from '@/services/mcpService';
import { toast } from '@/components/ui/sonner';

interface MCPAuthManagerProps {
  authKeyName: string;
  authType: string;
  onCancel: () => void;
}

const MCPAuthManager = ({ authKeyName, authType, onCancel }: MCPAuthManagerProps) => {
  const [keyValue, setKeyValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!keyValue) {
      toast.error('Please enter a valid key');
      return;
    }

    setIsSaving(true);
    try {
      const success = await mcpService.saveMCPAuthKey(authKeyName, keyValue);
      if (success) {
        toast.success('Authentication key saved successfully');
        onCancel();
      } else {
        toast.error('Failed to save authentication key');
      }
    } catch (error) {
      toast.error('An error occurred while saving the key');
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Configure Authentication
        </CardTitle>
        <CardDescription>
          This MCP requires authentication. Please provide your {authKeyName}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="auth-key">
              {authType === 'api_key' ? 'API Key' : 'Authentication Token'}
            </Label>
            <div className="flex items-center">
              <Key className="mr-2 h-4 w-4 text-muted-foreground" />
              <Input
                id="auth-key"
                type="password"
                placeholder={`Enter your ${authKeyName}`}
                value={keyValue}
                onChange={(e) => setKeyValue(e.target.value)}
                className="flex-1"
              />
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onCancel}>
          <X className="mr-2 h-4 w-4" />
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <span className="animate-spin mr-2">⏳</span>
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Key
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default MCPAuthManager;
