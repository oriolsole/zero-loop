
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff, Shield, Trash2, Plus, Save } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

interface APIKey {
  id: string;
  name: string;
  value: string; // In a real app, this would be stored securely and not exposed in the UI
  createdAt: string;
}

const APIKeyManagement = () => {
  const [keys, setKeys] = useState<APIKey[]>([]);
  const [showAddKey, setShowAddKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');
  const [showValues, setShowValues] = useState<Record<string, boolean>>({});

  const toggleShowValue = (id: string) => {
    setShowValues(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleAddKey = () => {
    if (!newKeyName || !newKeyValue) {
      toast.error('Please provide both a name and value for the key');
      return;
    }

    const newKey: APIKey = {
      id: crypto.randomUUID(),
      name: newKeyName,
      value: newKeyValue,
      createdAt: new Date().toISOString()
    };

    setKeys(prev => [...prev, newKey]);
    setShowAddKey(false);
    setNewKeyName('');
    setNewKeyValue('');
    toast.success('API key added successfully');
  };

  const handleDeleteKey = (id: string) => {
    setKeys(prev => prev.filter(key => key.id !== id));
    toast.success('API key deleted');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">API Key Management</h2>
        <Button onClick={() => setShowAddKey(true)} variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Add New Key
        </Button>
      </div>

      {showAddKey && (
        <Card>
          <CardHeader>
            <CardTitle>Add New API Key</CardTitle>
            <CardDescription>
              Add a new API key for connecting to external services
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="key-name">Key Name</Label>
              <Input
                id="key-name"
                placeholder="e.g. OPENAI_API_KEY"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="key-value">Key Value</Label>
              <Input
                id="key-value"
                type="password"
                placeholder="Enter your API key"
                value={newKeyValue}
                onChange={(e) => setNewKeyValue(e.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setShowAddKey(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddKey}>
              <Save className="h-4 w-4 mr-2" />
              Save Key
            </Button>
          </CardFooter>
        </Card>
      )}

      <div className="space-y-4">
        {keys.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
              <Shield className="h-12 w-12 mb-4 text-muted-foreground/50" />
              <p>No API keys have been added yet.</p>
              <p className="text-sm">API keys allow MCPs to connect to external services.</p>
            </CardContent>
          </Card>
        ) : (
          keys.map(key => (
            <Card key={key.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center">
                  <Shield className="h-4 w-4 mr-2 text-primary" />
                  {key.name}
                </CardTitle>
                <CardDescription className="text-xs">
                  Added on {new Date(key.createdAt).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Input
                    value={showValues[key.id] ? key.value : '•'.repeat(20)}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleShowValue(key.id)}
                  >
                    {showValues[key.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                  </Button>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end pt-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteKey(key.id)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default APIKeyManagement;
