
import React from 'react';
import TokenForm from './TokenForm';
import JiraConfigHelper from './JiraConfigHelper';
import GoogleDriveConnection from './GoogleDriveConnection';

interface MCPAuthManagerProps {
  provider: string;
  onCancel: () => void;
  authKeyName?: string;
  authType?: 'api_key' | 'oauth' | 'basic';
}

const MCPAuthManager: React.FC<MCPAuthManagerProps> = ({ 
  provider, 
  onCancel, 
  authKeyName, 
  authType 
}) => {
  // Special handling for Google Drive OAuth
  if (provider === 'google-drive-tools' || provider === 'google-drive') {
    return (
      <div className="space-y-4">
        <GoogleDriveConnection 
          onConnectionChange={(connected) => {
            if (connected) {
              // Close the dialog after successful connection
              onCancel();
            }
          }}
        />
        <div className="flex justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm border rounded-md hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  // Special handling for Jira configuration
  if (provider === 'jira') {
    return (
      <JiraConfigHelper 
        onConfigSaved={() => {
          // Close the dialog and trigger a refresh
          onCancel();
          window.location.reload();
        }}
      />
    );
  }

  // Default token form for other providers
  return (
    <TokenForm
      defaultProvider={provider}
      onSave={(data) => {
        // Handle saving the token
        console.log('Saving token:', data);
        onCancel();
      }}
      onCancel={onCancel}
    />
  );
};

export default MCPAuthManager;
