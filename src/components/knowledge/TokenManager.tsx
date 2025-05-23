
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TokenList from './TokenList';
import TokenForm from './TokenForm';
import { UserSecret } from '@/types/mcp';
import { userSecretService } from '@/services/userSecretService';
import { useQuery } from '@tanstack/react-query';
import { Shield, Key, Plus, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

interface TokenManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TokenManager: React.FC<TokenManagerProps> = ({ open, onOpenChange }) => {
  const [isAddingToken, setIsAddingToken] = useState(false);
  const [currentProvider, setCurrentProvider] = useState<string>('github');
  const [editingSecret, setEditingSecret] = useState<UserSecret | null>(null);
  
  // Fetch user secrets using react-query
  const { 
    data: userSecrets, 
    isLoading, 
    refetch 
  } = useQuery({
    queryKey: ['user-secrets'],
    queryFn: userSecretService.fetchUserSecrets,
    enabled: open, // Only fetch when dialog is open
  });

  // Group secrets by provider
  const secretsByProvider: Record<string, UserSecret[]> = {};
  
  if (userSecrets) {
    userSecrets.forEach(secret => {
      if (!secretsByProvider[secret.provider]) {
        secretsByProvider[secret.provider] = [];
      }
      secretsByProvider[secret.provider].push(secret);
    });
  }

  // Get unique providers
  const providers = Object.keys(secretsByProvider);
  
  const handleAddToken = () => {
    setEditingSecret(null);
    setIsAddingToken(true);
  };
  
  const handleEditToken = (token: UserSecret) => {
    setEditingSecret(token);
    setIsAddingToken(true);
  };
  
  const handleDeleteToken = async (id: string) => {
    const success = await userSecretService.deleteUserSecret(id);
    if (success) {
      refetch();
    }
  };
  
  const handleToggleTokenStatus = async (id: string, isActive: boolean) => {
    const updated = await userSecretService.toggleUserSecretStatus(id, isActive);
    if (updated) {
      refetch();
    }
  };
  
  const handleSaveToken = async (token: any) => {
    let result: UserSecret | null;
    
    if (editingSecret) {
      // Update existing token
      result = await userSecretService.updateUserSecret({
        id: editingSecret.id,
        ...token
      });
    } else {
      // Create new token
      result = await userSecretService.createUserSecret(token);
    }
    
    if (result) {
      refetch();
      setIsAddingToken(false);
      setEditingSecret(null);
    }
  };
  
  // If showing the form, render that instead
  if (isAddingToken) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              {editingSecret ? 'Edit API Token' : 'Add New API Token'}
            </DialogTitle>
            <DialogDescription>
              {editingSecret 
                ? 'Update your API token details below.'
                : 'Add a new API token to use with compatible MCPs.'}
            </DialogDescription>
          </DialogHeader>
          
          <TokenForm 
            secret={editingSecret} 
            onSave={handleSaveToken} 
            onCancel={() => {
              setIsAddingToken(false);
              setEditingSecret(null);
            }}
            defaultProvider={currentProvider}
          />
        </DialogContent>
      </Dialog>
    );
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            API Token Management
          </DialogTitle>
          <DialogDescription>
            Manage your API tokens for use with MCPs. Tokens are stored securely and are never exposed after saving.
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                {userSecrets?.length || 0} API tokens found
              </div>
              <Button onClick={handleAddToken} className="flex gap-1">
                <Plus className="h-4 w-4" />
                Add Token
              </Button>
            </div>
            
            {providers.length > 0 ? (
              <Tabs defaultValue={providers[0]} value={currentProvider} onValueChange={setCurrentProvider}>
                <TabsList className="grid grid-cols-3 mb-4">
                  {providers.map(provider => (
                    <TabsTrigger key={provider} value={provider} className="capitalize">
                      {provider}
                    </TabsTrigger>
                  ))}
                </TabsList>
                
                {providers.map(provider => (
                  <TabsContent key={provider} value={provider}>
                    <TokenList 
                      tokens={secretsByProvider[provider]} 
                      onEdit={handleEditToken} 
                      onDelete={handleDeleteToken}
                      onToggleStatus={handleToggleTokenStatus}
                    />
                  </TabsContent>
                ))}
              </Tabs>
            ) : (
              <Card className="p-6 text-center">
                <div className="text-muted-foreground">
                  No API tokens found. Add a token to get started.
                </div>
              </Card>
            )}
          </div>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TokenManager;
