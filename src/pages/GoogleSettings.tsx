
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import GoogleServicesStatus from '@/components/GoogleServicesStatus';
import GoogleServicesConnection from '@/components/GoogleServicesConnection';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const GoogleSettingsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="text-center py-8">
            <p>Please sign in to manage your Google services.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        
        <h1 className="text-3xl font-bold mb-2">Google Services</h1>
        <p className="text-muted-foreground">
          Manage your Google account connections and view which services are available.
        </p>
      </div>

      <div className="space-y-6">
        <GoogleServicesConnection />
        <GoogleServicesStatus />
        
        <Card>
          <CardHeader>
            <CardTitle>About Google Integration</CardTitle>
            <CardDescription>
              ZeroLoop integrates with Google services to enhance your intelligence framework
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium">Why Two Connection Types?</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <strong>Google Authentication:</strong> Used for secure login to ZeroLoop</li>
                <li>• <strong>Google Services Connection:</strong> Enables API access to Google services</li>
                <li>• Both can work independently - you can use email/password and still connect Google services</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">Available Services:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <strong>Google Drive:</strong> Access and manage your files</li>
                <li>• <strong>Gmail:</strong> Read and send emails</li>
                <li>• <strong>Calendar:</strong> Manage your events and schedules</li>
                <li>• <strong>Sheets & Docs:</strong> Work with spreadsheets and documents</li>
                <li>• <strong>Contacts:</strong> Access your contact information</li>
                <li>• <strong>Photos:</strong> Access your photo library</li>
                <li>• <strong>YouTube:</strong> Access your YouTube data</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">Security & Privacy:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• All tokens are encrypted and stored securely</li>
                <li>• You control which services to connect</li>
                <li>• You can disconnect services at any time</li>
                <li>• Tokens are automatically refreshed when needed</li>
                <li>• Separate from your login authentication for added security</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GoogleSettingsPage;
