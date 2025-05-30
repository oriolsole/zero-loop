
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
    console.log('🔄 Initiating OAuth flow...');
    
    const response = await supabase.functions.invoke('google-oauth-initiate');
    
    if (response.error) {
      console.error('❌ Failed to initiate OAuth:', response.error);
      throw new Error(response.error.message || 'Failed to initiate OAuth');
    }
    
    console.log('✅ OAuth initiation successful');
    return response.data;
  }

  /**
   * Complete OAuth flow with received tokens
   */
  async completeOAuth(tokens: any): Promise<void> {
    console.log('🔄 Starting completeOAuth...');
    console.log('📥 Received tokens:', {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      expiresIn: tokens.expires_in,
      scope: tokens.scope
    });

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('❌ Error getting user:', userError);
        throw new Error(`Failed to get user: ${userError.message}`);
      }
      
      if (!user) {
        console.error('❌ User not authenticated');
        throw new Error('User not authenticated');
      }

      console.log('✅ User authenticated:', user.id);

      // Handle missing expires_in with default
      const expiresInSeconds = tokens.expires_in || 3600;
      const expiresAt = new Date(Date.now() + (expiresInSeconds * 1000));

      console.log('📅 Token expiration calculated:', {
        expiresInSeconds,
        expiresAt: expiresAt.toISOString()
      });

      const tokenPayload = {
        tokens: {
          ...tokens,
          expires_at: expiresAt.toISOString()
        },
        user_id: user.id
      };

      console.log('📤 Sending POST request to google-oauth-callback...');
      console.log('📦 Payload:', {
        user_id: tokenPayload.user_id,
        hasTokens: !!tokenPayload.tokens,
        tokenKeys: Object.keys(tokenPayload.tokens)
      });

      // Use the edge function to handle token storage with encryption
      const { data, error } = await supabase.functions.invoke('google-oauth-callback', {
        body: tokenPayload
      });

      console.log('📨 Response from google-oauth-callback:', {
        data,
        error,
        hasData: !!data,
        hasError: !!error
      });

      if (error) {
        console.error('❌ Failed to save OAuth tokens:', error);
        throw new Error(`Failed to save OAuth tokens: ${error.message}`);
      }

      if (!data || !data.success) {
        console.error('❌ Unexpected response from callback:', data);
        throw new Error('Unexpected response from OAuth callback');
      }

      console.log('✅ OAuth tokens saved successfully');

      // Verify the token was actually stored
      console.log('🔍 Verifying token storage...');
      const connectionStatus = await this.getConnectionStatus();
      console.log('📊 Connection status after save:', connectionStatus);
      
      if (!connectionStatus.connected) {
        console.error('❌ Token verification failed - not connected after save');
        throw new Error('Token was not properly stored - verification failed');
      }

      console.log('✅ Token storage verified successfully');
    } catch (error) {
      console.error('❌ Error in completeOAuth:', error);
      throw error;
    }
  }

  /**
   * Check if user has connected Google Drive
   */
  async getConnectionStatus(): Promise<GoogleOAuthStatus> {
    console.log('🔍 Checking connection status...');
    
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('❌ Error getting user for status check:', userError);
        return { connected: false };
      }
      
      if (!user) {
        console.log('ℹ️ No authenticated user');
        return { connected: false };
      }

      console.log('🔍 Checking tokens for user:', user.id);

      // Check if tokens exist in database
      const { data: tokenData, error } = await supabase
        .from('google_oauth_tokens')
        .select('expires_at, scope')
        .eq('user_id', user.id)
        .maybeSingle();

      console.log('📊 Token query result:', {
        tokenData,
        error,
        hasTokenData: !!tokenData
      });

      if (error) {
        console.error('❌ Error checking connection status:', error);
        return { connected: false };
      }

      if (!tokenData) {
        console.log('ℹ️ No tokens found for user');
        return { connected: false };
      }

      console.log('✅ Tokens found, connection verified');
      return {
        connected: true,
        expires_at: tokenData.expires_at
      };
    } catch (error) {
      console.error('❌ Error in getConnectionStatus:', error);
      return { connected: false };
    }
  }

  /**
   * Disconnect Google Drive (remove stored tokens)
   */
  async disconnect(): Promise<void> {
    console.log('🔄 Disconnecting Google Drive...');
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { error } = await supabase
      .from('google_oauth_tokens')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      console.error('❌ Failed to disconnect:', error);
      throw new Error(`Failed to disconnect Google Drive: ${error.message}`);
    }

    console.log('✅ Successfully disconnected Google Drive');
  }

  /**
   * Open OAuth popup window with improved message handling
   */
  async connectWithPopup(): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        console.log('🔄 Starting popup OAuth flow...');
        console.log('🌐 Current origin:', window.location.origin);
        
        const { authUrl } = await this.initiateOAuth();
        
        console.log('🪟 Opening popup window...');
        const popup = window.open(
          authUrl,
          'google-oauth',
          'width=500,height=600,scrollbars=yes,resizable=yes'
        );

        if (!popup) {
          reject(new Error('Failed to open popup window. Please check if popups are blocked.'));
          return;
        }

        let isCompleted = false;
        let pollAttempts = 0;
        const maxPollAttempts = 30; // 30 seconds
        let pollInterval: number | undefined;

        // Enhanced message handler with better data structure debugging
        const messageHandler = async (event: MessageEvent) => {
          console.log('📨 Received message in parent:', {
            origin: event.origin,
            expectedOrigin: window.location.origin,
            eventData: event.data,
            dataType: typeof event.data,
            isCompleted
          });

          // Only accept messages from our origin
          if (event.origin !== window.location.origin) {
            console.log('⚠️ Ignoring message from different origin:', {
              received: event.origin,
              expected: window.location.origin
            });
            return;
          }

          // Skip if already completed
          if (isCompleted) {
            console.log('⚠️ Ignoring message - flow already completed');
            return;
          }

          // Extract message data safely
          const messageType = event.data?.type;
          const messageTokens = event.data?.tokens;
          const messageError = event.data?.error;

          console.log('🔍 Extracted message data:', {
            messageType,
            hasTokens: !!messageTokens,
            messageError
          });

          if (messageType === 'google-oauth-success' && messageTokens) {
            try {
              console.log('✅ Received OAuth success message');
              isCompleted = true;
              
              // Clear the polling interval
              if (pollInterval !== undefined) {
                clearInterval(pollInterval);
                pollInterval = undefined;
              }
              
              // Complete the OAuth flow
              console.log('🔄 Completing OAuth flow with tokens...');
              await this.completeOAuth(messageTokens);
              
              // Send confirmation to popup to close it
              console.log('📤 Sending close confirmation to popup');
              popup.postMessage({ type: 'oauth-close-popup' }, window.location.origin);
              
              // Clean up
              window.removeEventListener('message', messageHandler);
              
              // Ensure popup is closed
              setTimeout(() => {
                if (!popup.closed) {
                  console.log('🔒 Force closing popup');
                  popup.close();
                }
              }, 1000);
              
              resolve();
            } catch (error) {
              console.error('❌ Error completing OAuth:', error);
              isCompleted = true;
              
              // Clear interval and clean up
              if (pollInterval !== undefined) {
                clearInterval(pollInterval);
                pollInterval = undefined;
              }
              window.removeEventListener('message', messageHandler);
              
              if (!popup.closed) {
                popup.close();
              }
              
              reject(error);
            }
          } else if (messageType === 'google-oauth-error') {
            console.error('❌ OAuth error from popup:', messageError);
            isCompleted = true;
            
            if (pollInterval !== undefined) {
              clearInterval(pollInterval);
              pollInterval = undefined;
            }
            window.removeEventListener('message', messageHandler);
            
            if (!popup.closed) {
              popup.close();
            }
            
            reject(new Error(`OAuth error: ${messageError}`));
          } else {
            console.log('🤷 Unknown or invalid message type:', {
              messageType,
              fullData: event.data
            });
          }
        };

        // Set up message listener
        console.log('👂 Setting up message listener...');
        window.addEventListener('message', messageHandler);

        // Improved polling mechanism with proper bounds checking
        const pollForCompletion = () => {
          pollAttempts++;
          console.log(`🔄 Polling attempt ${pollAttempts}/${maxPollAttempts}`);
          
          // Check if we've exceeded the limit
          if (pollAttempts >= maxPollAttempts) {
            console.log('⏰ Polling timeout - max attempts reached');
            isCompleted = true;
            
            // Clean up
            if (pollInterval !== undefined) {
              clearInterval(pollInterval);
              pollInterval = undefined;
            }
            window.removeEventListener('message', messageHandler);
            
            if (!popup.closed) {
              popup.close();
            }
            
            reject(new Error('OAuth flow timed out. No response received from popup.'));
            return;
          }
          
          // Check if popup was closed manually
          if (popup.closed && !isCompleted) {
            console.log('⚠️ Popup closed manually by user');
            isCompleted = true;
            
            if (pollInterval !== undefined) {
              clearInterval(pollInterval);
              pollInterval = undefined;
            }
            window.removeEventListener('message', messageHandler);
            
            reject(new Error('OAuth popup was closed by user.'));
            return;
          }
        };

        // Start polling with proper interval management
        pollInterval = window.setInterval(pollForCompletion, 1000);

        console.log('✅ Popup OAuth setup complete, waiting for response...');

      } catch (error) {
        console.error('❌ Error in connectWithPopup:', error);
        reject(error);
      }
    });
  }
}

export const googleOAuthService = new GoogleOAuthService();
