
import { supabase } from '@/integrations/supabase/client';
import { GOOGLE_SCOPES } from '@/types/googleScopes';

export interface EnhancedUserProfile {
  id: string;
  email?: string;
  full_name?: string;
  avatar_url?: string;
  google_id?: string;
  google_services_connected: string[]; // Array of connected scope IDs
  google_scopes_granted: string[]; // Array of actual OAuth scopes
  google_drive_connected: boolean;
  created_at: string;
  updated_at: string;
}

class EnhancedProfileService {
  /**
   * Get current user's enhanced profile
   */
  async getProfile(): Promise<EnhancedUserProfile | null> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return null;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }

    // Transform the profile to include enhanced fields with proper defaults
    return {
      ...data,
      google_services_connected: data.google_services_connected || [],
      google_scopes_granted: data.google_scopes_granted || []
    } as EnhancedUserProfile;
  }

  /**
   * Update user's profile with Google services information
   */
  async updateGoogleServices(scopes: string[]): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Map scopes to service IDs
    const connectedServices = GOOGLE_SCOPES
      .filter(scopeInfo => scopes.includes(scopeInfo.scope))
      .map(scopeInfo => scopeInfo.id);

    const { error } = await supabase
      .from('profiles')
      .update({
        google_services_connected: connectedServices,
        google_scopes_granted: scopes,
        google_drive_connected: scopes.includes('https://www.googleapis.com/auth/drive'),
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (error) {
      console.error('Error updating Google services:', error);
      throw new Error(`Failed to update Google services: ${error.message}`);
    }
  }

  /**
   * Check if a specific Google service is connected
   */
  async isServiceConnected(serviceId: string): Promise<boolean> {
    const profile = await this.getProfile();
    return profile?.google_services_connected?.includes(serviceId) || false;
  }

  /**
   * Check if a specific OAuth scope is granted
   */
  async isScopeGranted(scope: string): Promise<boolean> {
    const profile = await this.getProfile();
    return profile?.google_scopes_granted?.includes(scope) || false;
  }

  /**
   * Get connected services with their details
   */
  async getConnectedServices(): Promise<Array<{id: string, name: string, scope: string}>> {
    const profile = await this.getProfile();
    if (!profile?.google_services_connected) return [];

    return GOOGLE_SCOPES
      .filter(scope => profile.google_services_connected.includes(scope.id))
      .map(scope => ({
        id: scope.id,
        name: scope.name,
        scope: scope.scope
      }));
  }

  /**
   * Disconnect all Google services
   */
  async disconnectGoogleServices(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        google_services_connected: [],
        google_scopes_granted: [],
        google_drive_connected: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (error) {
      console.error('Error disconnecting Google services:', error);
      throw new Error(`Failed to disconnect Google services: ${error.message}`);
    }
  }
}

export const enhancedProfileService = new EnhancedProfileService();
