
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from '@/components/ui/sonner';
import { useLoopStore } from '../store/useLoopStore';
import DomainEditor from '../components/DomainEditor';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from 'lucide-react';
import { useSupabaseLogger } from '../hooks/useSupabaseLogger';
import { isSupabaseConfigured } from '../utils/supabase-client';

// Helper function to check if browser storage is possibly low
const isStorageMaybeRunningLow = (): boolean => {
  try {
    // Try to estimate available storage by writing a test value
    const testKey = `storage-test-${Date.now()}`;
    const testData = new Array(100000).join('a'); // Create a ~100KB string
    localStorage.setItem(testKey, testData);
    localStorage.removeItem(testKey);
    return false; // If we got here, we likely have space
  } catch (e) {
    console.warn('Storage test failed, might be running low on space');
    return true; // If we caught an error, we might be running low
  }
};

const DomainCustomization: React.FC = () => {
  const navigate = useNavigate();
  const { domainId } = useParams<{ domainId: string }>();
  const { domains, addNewDomain, updateDomain, deleteDomain } = useLoopStore();
  const { state: supabaseState, queueDomain, syncPendingItems } = useSupabaseLogger();
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [storageWarning, setStorageWarning] = useState<boolean>(isStorageMaybeRunningLow());
  
  // Find the domain if editing an existing one
  const domain = domains.find(d => d.id === domainId);
  const isNew = !domain;
  
  const handleSave = async (updatedDomain: any) => {
    try {
      setIsSaving(true);
      setSaveError(null);
      console.log("Saving domain:", updatedDomain);
      
      // If we detect storage might be low and remote logging is not enabled,
      // show a warning and encourage remote syncing
      if (storageWarning && !supabaseState.isRemoteEnabled) {
        toast.warning('Your local storage is running low. Consider enabling Remote Logging.');
      }
      
      // Save locally first
      if (isNew) {
        addNewDomain(updatedDomain);
      } else {
        updateDomain(updatedDomain);
      }
      
      // If remote logging is enabled, queue the domain for syncing with Supabase
      if (supabaseState.isRemoteEnabled) {
        try {
          console.log("Queueing domain for Supabase sync:", updatedDomain.id);
          queueDomain(updatedDomain);
          
          // Trigger an immediate sync to save to Supabase
          const syncResult = await syncPendingItems();
          if (syncResult) {
            toast.success('Domain saved locally and synced to Supabase.');
          } else {
            toast.warning('Domain saved locally but failed to sync to Supabase.');
          }
        } catch (syncError) {
          console.error("Error syncing to Supabase:", syncError);
          toast.warning('Domain saved locally but failed to sync to Supabase due to an error.');
        }
      } else {
        console.log("Remote logging disabled, domain will not be synced to Supabase");
        toast.info("Domain saved locally. Enable Remote Logging to save to database.");
      }
      
      setIsSaving(false);
      navigate('/');
    } catch (error) {
      console.error("Error saving domain:", error);
      
      // Special handling for storage quota issues
      if (error instanceof DOMException && 
          (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
        
        const errorMessage = 'Browser storage quota exceeded. Please enable Remote Logging or clear some local data.';
        setSaveError(errorMessage);
        toast.error(errorMessage);
        setStorageWarning(true);
        
        // If Supabase is configured but not enabled, suggest enabling it
        if (isSupabaseConfigured() && !supabaseState.isRemoteEnabled) {
          toast.error('Enable Remote Logging in settings to avoid storage issues.', {
            duration: 6000
          });
        }
      } else {
        setSaveError(error instanceof Error ? error.message : 'Unknown error');
        toast.error(`Failed to save domain: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      
      setIsSaving(false);
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
      
      {storageWarning && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Storage Space Low</AlertTitle>
          <AlertDescription>
            Your browser storage is running low. Enable Remote Logging to avoid data loss.
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
        isSaving={isSaving}
      />
    </div>
  );
};

export default DomainCustomization;
