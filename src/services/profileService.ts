
import { supabase } from '@/integrations/supabase/client';

export interface UserProfile {
  id: string;
  email?: string;
  full_name?: string;
  avatar_url?: string;
  google_id?: string;
  google_drive_connected: boolean;
  google_services_connected?: string[];
  google_scopes_granted?: string[];
  created_at: string;
  updated_at: string;
}

class ProfileService {
  /**
   * Get current user's profile
   */
  async getProfile(): Promise<UserProfile | null> {
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

    return data as UserProfile;
  }

  /**
   * Update user's profile
   */
  async updateProfile(updates: Partial<Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>>): Promise<UserProfile | null> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating profile:', error);
      throw new Error(`Failed to update profile: ${error.message}`);
    }

    return data as UserProfile;
  }

  /**
   * Mark Google Drive as connected
   */
  async markGoogleDriveConnected(): Promise<void> {
    await this.updateProfile({ google_drive_connected: true });
  }

  /**
   * Mark Google Drive as disconnected
   */
  async markGoogleDriveDisconnected(): Promise<void> {
    await this.updateProfile({ google_drive_connected: false });
  }
}

export const profileService = new ProfileService();
