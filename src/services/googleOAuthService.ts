
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
        let closureCheckInterval: number | undefined;
        let messageReceived = false;

        // Enhanced message handler with better data structure debugging
        const messageHandler = async (event: MessageEvent) => {
          console.log('📨 Received message in parent:', {
            origin: event.origin,
            expectedOrigin: window.location.origin,
            eventData: event.data,
            dataType: typeof event.data,
            dataKeys: event.data ? Object.keys(event.data) : 'no data',
            rawData: JSON.stringify(event.data),
            messageReceived: messageReceived
          });

          // Only accept messages from our origin
          if (event.origin !== window.location.origin) {
            console.log('⚠️ Ignoring message from different origin:', {
              received: event.origin,
              expected: window.location.origin
            });
            return;
          }

          messageReceived = true;

          // More flexible message type detection
          let messageType = null;
          let messageTokens = null;
          let messageError = null;

          if (event.data && typeof event.data === 'object') {
            messageType = event.data.type;
            messageTokens = event.data.tokens;
            messageError = event.data.error;
          }

          console.log('🔍 Extracted message data:', {
            messageType,
            hasTokens: !!messageTokens,
            messageError
          });

          if (messageType === 'google-oauth-success') {
            try {
              console.log('✅ Received OAuth success message');
              
              // Clear the closure check interval since we received a valid message
              if (closureCheckInterval !== undefined) {
                clearInterval(closureCheckInterval);
                closureCheckInterval = undefined;
              }
              
              isCompleted = true;
              
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
              if (closureCheckInterval !== undefined) {
                clearInterval(closureCheckInterval);
                closureCheckInterval = undefined;
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
            
            if (closureCheckInterval !== undefined) {
              clearInterval(closureCheckInterval);
              closureCheckInterval = undefined;
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

        // Set up message listener BEFORE opening popup
        console.log('👂 Setting up message listener...');
        window.addEventListener('message', messageHandler);

        // Add a fallback polling mechanism
        let pollAttempts = 0;
        const maxPollAttempts = 30; // 30 seconds

        const pollForCompletion = () => {
          pollAttempts++;
          console.log(`🔄 Polling attempt ${pollAttempts}/${maxPollAttempts}, messageReceived: ${messageReceived}`);
          
          if (popup.closed && !isCompleted && !messageReceived) {
            console.log('⚠️ Popup closed without receiving message - possible communication failure');
            window.removeEventListener('message', messageHandler);
            if (closureCheckInterval !== undefined) {
              clearInterval(closureCheckInterval);
            }
            reject(new Error('OAuth popup was closed before completion. This might be due to a communication error.'));
            return;
          }
          
          if (pollAttempts >= maxPollAttempts && !messageReceived) {
            console.log('⏰ Polling timeout - no message received');
            window.removeEventListener('message', messageHandler);
            if (closureCheckInterval !== undefined) {
              clearInterval(closureCheckInterval);
            }
            if (!popup.closed) {
              popup.close();
            }
            reject(new Error('OAuth flow timed out. No response received from popup.'));
          }
        };

        // Check if popup was closed manually (only if flow hasn't completed)
        closureCheckInterval = window.setInterval(pollForCompletion, 1000);

        console.log('✅ Popup OAuth setup complete, waiting for response...');

      } catch (error) {
        console.error('❌ Error in connectWithPopup:', error);
        reject(error);
      }
    });
  }
}

export const googleOAuthService = new GoogleOAuthService();
