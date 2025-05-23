
import { supabase } from '@/integrations/supabase/client';
import { UserSecret, CreateUserSecretParams, UpdateUserSecretParams } from '@/types/mcp';
import { toast } from '@/components/ui/sonner';

export const userSecretService = {
  /**
   * Fetch all user secrets for the current user
   */
  async fetchUserSecrets(): Promise<UserSecret[]> {
    try {
      const { data, error } = await supabase
        .from('user_secrets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Return the data as UserSecret array
      return data as UserSecret[];
    } catch (error) {
      console.error('Error fetching user secrets:', error);
      toast.error('Failed to load API tokens');
      return [];
    }
  },

  /**
   * Fetch secrets by provider
   */
  async fetchSecretsByProvider(provider: string): Promise<UserSecret[]> {
    try {
      const { data, error } = await supabase
        .from('user_secrets')
        .select('*')
        .eq('provider', provider)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return data as UserSecret[];
    } catch (error) {
      console.error(`Error fetching ${provider} secrets:`, error);
      return [];
    }
  },

  /**
   * Create a new user secret
   */
  async createUserSecret(secret: CreateUserSecretParams): Promise<UserSecret | null> {
    try {
      const { data, error } = await supabase
        .from('user_secrets')
        .insert(secret)
        .select()
        .single();

      if (error) throw error;
      
      toast.success('API token added successfully');
      return data as UserSecret;
    } catch (error: any) {
      console.error('Error creating user secret:', error);
      
      // Handle unique constraint violation
      if (error.code === '23505') {
        toast.error('A token with this provider and label already exists');
      } else {
        toast.error('Failed to add API token');
      }
      
      return null;
    }
  },

  /**
   * Update an existing user secret
   */
  async updateUserSecret(params: UpdateUserSecretParams): Promise<UserSecret | null> {
    try {
      const { id, ...updates } = params;
      
      // Don't allow updating the key through this method for security reasons
      // If key needs updating, delete and recreate the secret
      const updateData = { ...updates };
      delete updateData.key;
      
      const { data, error } = await supabase
        .from('user_secrets')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      toast.success('API token updated successfully');
      return data as UserSecret;
    } catch (error) {
      console.error('Error updating user secret:', error);
      toast.error('Failed to update API token');
      return null;
    }
  },

  /**
   * Delete a user secret
   */
  async deleteUserSecret(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_secrets')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('API token deleted successfully');
      return true;
    } catch (error) {
      console.error('Error deleting user secret:', error);
      toast.error('Failed to delete API token');
      return false;
    }
  },

  /**
   * Toggle a user secret active status
   */
  async toggleUserSecretStatus(id: string, isActive: boolean): Promise<UserSecret | null> {
    try {
      const { data, error } = await supabase
        .from('user_secrets')
        .update({ is_active: isActive })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      toast.success(`API token ${isActive ? 'enabled' : 'disabled'} successfully`);
      return data as UserSecret;
    } catch (error) {
      console.error('Error toggling user secret status:', error);
      toast.error(`Failed to ${isActive ? 'enable' : 'disable'} API token`);
      return null;
    }
  }
};
