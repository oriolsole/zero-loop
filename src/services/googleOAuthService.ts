
import { supabase } from '@/integrations/supabase/client';

export interface GoogleOAuthTokens {
  access_token: string;
  refresh_token?: string;
  expires_at: string;
  scope: string;
}

export interface GoogleOAuthStatus {
  connected: boolean;
  email?: string;
  expires_at?: string;
}

class GoogleOAuthService {
  /**
   * Initiate Google OAuth flow
   */
  async initiateOAuth(): Promise<{ authUrl: string; state: string }> {
    const response = await supabase.functions.invoke('google-oauth-initiate');
    
    if (response.error) {
      throw new Error(response.error.message || 'Failed to initiate OAuth');
    }
    
    return response.data;
  }

  /**
   * Complete OAuth flow with received tokens
   */
  async completeOAuth(tokens: any): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    const expiresAt = new Date(Date.now() + (tokens.expires_in * 1000));

    // Use the edge function to handle token storage
    const { error } = await supabase.functions.invoke('google-oauth-callback', {
      body: {
        tokens: {
          ...tokens,
          expires_at: expiresAt.toISOString()
        },
        user_id: user.id
      }
    });

    if (error) {
      throw new Error('Failed to save OAuth tokens');
    }
  }

  /**
   * Check if user has connected Google Drive
   */
  async getConnectionStatus(): Promise<GoogleOAuthStatus> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { connected: false };
    }

    try {
      // Try to make a simple call to check if tokens exist and are valid
      const response = await supabase.functions.invoke('google-drive-tools', {
        body: {
          action: 'get_connection_status',
          userId: user.id
        }
      });

      if (response.error) {
        return { connected: false };
      }

      return {
        connected: response.data?.connected || false,
        expires_at: response.data?.expires_at
      };
    } catch (error) {
      return { connected: false };
    }
  }

  /**
   * Disconnect Google Drive (remove stored tokens)
   */
  async disconnect(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { error } = await supabase.functions.invoke('google-drive-tools', {
      body: {
        action: 'disconnect',
        userId: user.id
      }
    });

    if (error) {
      throw new Error('Failed to disconnect Google Drive');
    }
  }

  /**
   * Open OAuth popup window
   */
  async connectWithPopup(): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        const { authUrl } = await this.initiateOAuth();
        
        const popup = window.open(
          authUrl,
          'google-oauth',
          'width=500,height=600,scrollbars=yes,resizable=yes'
        );

        if (!popup) {
          reject(new Error('Failed to open popup window'));
          return;
        }

        // Listen for OAuth completion
        const messageHandler = async (event: MessageEvent) => {
          if (event.origin !== window.location.origin) {
            return;
          }

          if (event.data.type === 'google-oauth-success') {
            try {
              await this.completeOAuth(event.data.tokens);
              window.removeEventListener('message', messageHandler);
              popup.close();
              resolve();
            } catch (error) {
              window.removeEventListener('message', messageHandler);
              popup.close();
              reject(error);
            }
          }
        };

        window.addEventListener('message', messageHandler);

        // Check if popup was closed manually
        const checkClosed = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkClosed);
            window.removeEventListener('message', messageHandler);
            reject(new Error('OAuth flow was cancelled'));
          }
        }, 1000);

      } catch (error) {
        reject(error);
      }
    });
  }
}

export const googleOAuthService = new GoogleOAuthService();
