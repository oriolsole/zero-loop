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
   * Get current user's enhanced profile, creating one if it doesn't exist
   */
  async getProfile(): Promise<EnhancedUserProfile | null> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return null;
    }

    let { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    // If profile doesn't exist, create it
    if (error && error.code === 'PGRST116') {
      console.log('Profile not found, creating new profile for user:', user.id);
      
      const newProfile = {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || null,
        avatar_url: user.user_metadata?.avatar_url || null,
        google_id: user.user_metadata?.provider_id || null,
        google_services_connected: [],
        google_scopes_granted: [],
        google_drive_connected: false
      };

      const { data: createdProfile, error: createError } = await supabase
        .from('profiles')
        .insert(newProfile)
        .select()
        .single();

      if (createError) {
        console.error('Error creating profile:', createError);
        return null;
      }

      data = createdProfile;
    } else if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }

    // Enhanced debugging for Drive connection detection
    console.log('📊 Enhanced Profile Service - Raw profile data:', data);
    console.log('📊 Profile google_services_connected:', data?.google_services_connected);
    console.log('📊 Profile google_scopes_granted:', data?.google_scopes_granted);
    console.log('📊 Profile google_drive_connected:', data?.google_drive_connected);

    // Transform the profile to include enhanced fields with proper defaults
    const enhancedProfile = {
      ...data,
      google_services_connected: data.google_services_connected || [],
      google_scopes_granted: data.google_scopes_granted || []
    } as EnhancedUserProfile;

    console.log('📊 Enhanced Profile Service - Final enhanced profile:', enhancedProfile);

    return enhancedProfile;
  }

  /**
   * Update user's profile with Google services information using enhanced mapping
   */
  async updateGoogleServices(scopes: string[]): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Enhanced mapping logic to handle scope variations
    const scopeToServiceMap: Record<string, string> = {
      'https://www.googleapis.com/auth/userinfo.email': 'google-account',
      'https://www.googleapis.com/auth/userinfo.profile': 'google-account',
      'https://www.googleapis.com/auth/drive': 'google-drive',
      'https://www.googleapis.com/auth/drive.file': 'google-drive',
      'https://www.googleapis.com/auth/drive.readonly': 'google-drive',
      'https://www.googleapis.com/auth/gmail.readonly': 'gmail',
      'https://www.googleapis.com/auth/gmail.modify': 'gmail',
      'https://www.googleapis.com/auth/gmail.send': 'gmail',
      'https://www.googleapis.com/auth/calendar': 'google-calendar',
      'https://www.googleapis.com/auth/calendar.readonly': 'google-calendar',
      'https://www.googleapis.com/auth/spreadsheets': 'google-sheets',
      'https://www.googleapis.com/auth/documents': 'google-docs',
      // Handle both contacts scope variants
      'https://www.googleapis.com/auth/contacts': 'google-contacts',
      'https://www.googleapis.com/auth/contacts.readonly': 'google-contacts',
      'https://www.googleapis.com/auth/photoslibrary.readonly': 'google-photos',
      'https://www.googleapis.com/auth/youtube.readonly': 'youtube'
    };

    const connectedServices = new Set<string>();
    
    // Map scopes to services
    scopes.forEach(scope => {
      const serviceId = scopeToServiceMap[scope];
      if (serviceId) {
        connectedServices.add(serviceId);
      }
    });

    // Always include google-account if we have any Google scopes
    if (scopes.length > 0 && scopes.some(scope => scope.includes('googleapis.com'))) {
      connectedServices.add('google-account');
    }

    const connectedServicesArray = Array.from(connectedServices);
    const hasDriveAccess = scopes.includes('https://www.googleapis.com/auth/drive');

    console.log('🔄 Enhanced service mapping:', {
      originalScopes: scopes,
      mappedServices: connectedServicesArray,
      hasDriveAccess
    });

    const { error } = await supabase
      .from('profiles')
      .update({
        google_services_connected: connectedServicesArray,
        google_scopes_granted: scopes,
        google_drive_connected: hasDriveAccess,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (error) {
      console.error('Error updating Google services:', error);
      throw new Error(`Failed to update Google services: ${error.message}`);
    }

    console.log('✅ Profile updated with enhanced service mapping');
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
