import { supabase } from '@/integrations/supabase/client';
import { getAllScopes, getRequiredScopes } from '@/types/googleScopes';
import { enhancedProfileService } from './enhancedProfileService';

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
  connectedServices?: string[];
  grantedScopes?: string[];
}

class EnhancedGoogleOAuthService {
  /**
   * Initiate Google OAuth flow with custom scopes and user context
   */
  async initiateOAuth(selectedScopes: string[] = []): Promise<{ authUrl: string; state: string }> {
    console.log('🔄 Initiating OAuth flow with scopes:', selectedScopes);
    
    // Get current user for context
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      throw new Error('User must be authenticated to connect Google APIs');
    }
    
    // Combine required scopes with selected optional scopes
    const requiredScopes = getRequiredScopes();
    const allScopes = [...new Set([...requiredScopes, ...selectedScopes])];
    
    console.log('📋 Final scopes to request:', allScopes);
    console.log('👤 User context:', user.id);
    
    const response = await supabase.functions.invoke('google-oauth-initiate', {
      body: { 
        scopes: allScopes,
        userId: user.id  // Pass user ID for state tracking
      }
    });
    
    if (response.error) {
      console.error('❌ Failed to initiate OAuth:', response.error);
      throw new Error(response.error.message || 'Failed to initiate OAuth');
    }
    
    console.log('✅ OAuth initiation successful');
    return response.data;
  }

  /**
   * Complete OAuth flow with received tokens and update profile
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
        expiresAt: expiresAt.toISOString(),
        grantedScopes: tokens.scope
      });

      const tokenPayload = {
        tokens: {
          ...tokens,
          expires_at: expiresAt.toISOString()
        },
        user_id: user.id
      };

      console.log('📤 Sending POST request to google-oauth-callback...');

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

      // Update profile with connected services
      const grantedScopes = tokens.scope ? tokens.scope.split(' ') : [];
      console.log('🔄 Updating profile with granted scopes:', grantedScopes);
      
      await enhancedProfileService.updateGoogleServices(grantedScopes);

      console.log('✅ OAuth tokens saved and profile updated successfully');

    } catch (error) {
      console.error('❌ Error in completeOAuth:', error);
      throw error;
    }
  }

  /**
   * Check connection status with enhanced service information
   */
  async getConnectionStatus(): Promise<GoogleOAuthStatus> {
    console.log('🔍 Checking enhanced connection status...');
    
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

      // Get profile information for enhanced status
      const profile = await enhancedProfileService.getProfile();

      console.log('✅ Tokens found, connection verified');
      return {
        connected: true,
        expires_at: tokenData.expires_at,
        connectedServices: profile?.google_services_connected || [],
        grantedScopes: profile?.google_scopes_granted || []
      };
    } catch (error) {
      console.error('❌ Error in getConnectionStatus:', error);
      return { connected: false };
    }
  }

  /**
   * Disconnect Google services (remove stored tokens and reset profile)
   */
  async disconnect(): Promise<void> {
    console.log('🔄 Disconnecting Google services...');
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Remove tokens
    const { error: tokenError } = await supabase
      .from('google_oauth_tokens')
      .delete()
      .eq('user_id', user.id);

    if (tokenError) {
      console.error('❌ Failed to remove tokens:', tokenError);
      throw new Error(`Failed to remove tokens: ${tokenError.message}`);
    }

    // Reset profile Google services
    await enhancedProfileService.disconnectGoogleServices();

    console.log('✅ Successfully disconnected all Google services');
  }

  /**
   * Enhanced redirect-only OAuth flow (no popups)
   */
  async connectWithRedirect(selectedScopes: string[] = []): Promise<void> {
    console.log('🔄 Starting redirect-only OAuth flow...');
    
    try {
      const { authUrl } = await this.initiateOAuth(selectedScopes);
      
      console.log('🔗 Redirecting to Google OAuth...');
      // Simple redirect - no popup
      window.location.href = authUrl;
    } catch (error) {
      console.error('❌ Error in connectWithRedirect:', error);
      throw error;
    }
  }

  // Keep connectWithPopup for backward compatibility but deprecate it
  async connectWithPopup(selectedScopes: string[] = []): Promise<void> {
    console.warn('⚠️ connectWithPopup is deprecated, using redirect flow instead');
    return this.connectWithRedirect(selectedScopes);
  }
}

export const enhancedGoogleOAuthService = new EnhancedGoogleOAuthService();
