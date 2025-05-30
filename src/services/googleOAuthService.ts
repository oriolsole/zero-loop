
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

    // Handle missing expires_in with default
    const expiresInSeconds = tokens.expires_in || 3600;
    const expiresAt = new Date(Date.now() + (expiresInSeconds * 1000));

    console.log('Completing OAuth with tokens:', { 
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      expiresIn: expiresInSeconds 
    });

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
      console.error('Failed to save OAuth tokens:', error);
      throw new Error(`Failed to save OAuth tokens: ${error.message}`);
    }

    console.log('OAuth tokens saved successfully');
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
      // Check if tokens exist in database
      const { data: tokenData, error } = await supabase
        .from('google_oauth_tokens')
        .select('expires_at, scope')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error checking connection status:', error);
        return { connected: false };
      }

      if (!tokenData) {
        return { connected: false };
      }

      return {
        connected: true,
        expires_at: tokenData.expires_at
      };
    } catch (error) {
      console.error('Error in getConnectionStatus:', error);
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

    const { error } = await supabase
      .from('google_oauth_tokens')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      console.error('Failed to disconnect:', error);
      throw new Error(`Failed to disconnect Google Drive: ${error.message}`);
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
          reject(new Error('Failed to open popup window. Please check if popups are blocked.'));
          return;
        }

        // Listen for OAuth completion
        const messageHandler = async (event: MessageEvent) => {
          // Only accept messages from our origin
          if (event.origin !== window.location.origin) {
            return;
          }

          if (event.data.type === 'google-oauth-success') {
            try {
              console.log('Received OAuth success message');
              await this.completeOAuth(event.data.tokens);
              window.removeEventListener('message', messageHandler);
              popup.close();
              resolve();
            } catch (error) {
              console.error('Error completing OAuth:', error);
              window.removeEventListener('message', messageHandler);
              popup.close();
              reject(error);
            }
          } else if (event.data.type === 'google-oauth-error') {
            window.removeEventListener('message', messageHandler);
            popup.close();
            reject(new Error(`OAuth error: ${event.data.error}`));
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
        console.error('Error in connectWithPopup:', error);
        reject(error);
      }
    });
  }
}

export const googleOAuthService = new GoogleOAuthService();
