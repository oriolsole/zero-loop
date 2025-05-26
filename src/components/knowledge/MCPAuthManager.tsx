
import React from 'react';
import TokenForm from './TokenForm';
import JiraConfigHelper from './JiraConfigHelper';

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
  // Special handling for Jira configuration
  if (provider === 'jira') {
    return (
      <JiraConfigHelper 
        onConfigSaved={() => {
          // Refresh the page or trigger a re-render to update the auth status
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
      }}
      onCancel={onCancel}
    />
  );
};

export default MCPAuthManager;
