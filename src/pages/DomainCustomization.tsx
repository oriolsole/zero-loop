
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from '@/components/ui/sonner';
import { useLoopStore } from '../store/useLoopStore';
import DomainEditor from '../components/DomainEditor';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from 'lucide-react';
import { useSupabaseLogger } from '../hooks/useSupabaseLogger';
import { isSupabaseConfigured } from '../utils/supabase-client';

const DomainCustomization: React.FC = () => {
  const navigate = useNavigate();
  const { domainId } = useParams<{ domainId: string }>();
  const { domains, addNewDomain, updateDomain, deleteDomain } = useLoopStore();
  const { state: supabaseState, queueDomain, syncPendingItems } = useSupabaseLogger();
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  
  // Find the domain if editing an existing one
  const domain = domains.find(d => d.id === domainId);
  const isNew = !domain;
  
  const handleSave = async (updatedDomain: any) => {
    try {
      setIsSaving(true);
      setSaveError(null);
      console.log("Saving domain:", updatedDomain);
      
      // Save locally first
      if (isNew) {
        addNewDomain(updatedDomain);
      } else {
        updateDomain(updatedDomain);
      }
      
      // If remote logging is enabled, queue the domain for syncing with Supabase
      if (supabaseState.isRemoteEnabled) {
        console.log("Queueing domain for Supabase sync:", updatedDomain.id);
        queueDomain(updatedDomain);
        
        // Trigger an immediate sync to save to Supabase
        const syncResult = await syncPendingItems();
        if (syncResult) {
          toast.success('Domain saved locally and synced to Supabase.');
        } else {
          toast.warning('Domain saved locally but failed to sync to Supabase.');
        }
      } else {
        console.log("Remote logging disabled, domain will not be synced to Supabase");
        toast.info("Domain saved locally. Enable Remote Logging to save to database.");
      }
      
      setIsSaving(false);
      navigate('/');
    } catch (error) {
      console.error("Error saving domain:", error);
      setSaveError(error instanceof Error ? error.message : 'Unknown error');
      setIsSaving(false);
      toast.error(`Failed to save domain: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };
  
  const handleCancel = () => {
    navigate('/');
  };
  
  const handleDelete = (id: string) => {
    deleteDomain(id);
    navigate('/');
  };
  
  return (
    <div className="container mx-auto py-8">
      {!supabaseState.isRemoteEnabled && (
        <Alert variant="warning" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Remote Logging Disabled</AlertTitle>
          <AlertDescription>
            Enable Remote Logging in settings to save domains to the database.
          </AlertDescription>
        </Alert>
      )}
      
      {saveError && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Saving Domain</AlertTitle>
          <AlertDescription>
            {saveError}
          </AlertDescription>
        </Alert>
      )}
      
      <DomainEditor 
        domain={domain} 
        onSave={handleSave} 
        onCancel={handleCancel} 
        onDelete={handleDelete}
        isNew={isNew}
      />
    </div>
  );
};

export default DomainCustomization;
