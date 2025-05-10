
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from '@/components/ui/sonner';
import { useLoopStore } from '../store/useLoopStore';
import DomainEditor from '../components/DomainEditor';

const DomainCustomization: React.FC = () => {
  const navigate = useNavigate();
  const { domainId } = useParams<{ domainId: string }>();
  const { domains, addNewDomain, updateDomain, deleteDomain } = useLoopStore();
  
  // Find the domain if editing an existing one
  const domain = domains.find(d => d.id === domainId);
  const isNew = !domain;
  
  const handleSave = (updatedDomain: any) => {
    if (isNew) {
      addNewDomain(updatedDomain);
    } else {
      updateDomain(updatedDomain);
    }
    navigate('/');
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
